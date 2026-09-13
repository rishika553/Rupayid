import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminKycService } from './admin-kyc.service';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';

const admin: CurrentAdminPayload = {
  id: 'admin-1',
  username: 'admin',
  status: 'ACTIVE',
  userId: 'staff-user-1',
  typ: 'admin',
};

function reviewableApp(overrides?: Record<string, unknown>) {
  return {
    id: 'kyc-1',
    userId: 'cust-1',
    status: 'SUBMITTED',
    submittedAt: new Date('2026-09-11T06:00:00.000Z'),
    reviewedAt: null,
    reviewedBy: null,
    declineReason: null,
    user: { id: 'cust-1', firstName: 'Aisha', lastName: 'Patel', phoneNumber: '+919876543210', phoneVerified: true },
    ...overrides,
  };
}

describe('AdminKycService', () => {
  it('lists applications with customer name, mobile, and latest submitted first', async () => {
    const prisma = {
      kycApplication: {
        findMany: jest.fn(async () => [reviewableApp()]),
        count: jest.fn(async () => 1),
      },
    };
    const service = new AdminKycService(prisma as never, { log: jest.fn() } as never, {
      getSignedDownloadUrl: jest.fn(),
    } as never);
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]).toEqual({
      id: 'kyc-1',
      customerId: 'cust-1',
      customerName: 'Aisha Patel',
      mobile: '+919876543210',
      submittedAt: new Date('2026-09-11T06:00:00.000Z'),
      status: 'SUBMITTED',
    });
    expect(prisma.kycApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      }),
    );
  });

  it('searches by customer name and mobile', async () => {
    const prisma = {
      kycApplication: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
    };
    const service = new AdminKycService(prisma as never, { log: jest.fn() } as never, {
      getSignedDownloadUrl: jest.fn(),
    } as never);
    await service.list({ search: '9876543210' });
    expect(prisma.kycApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ user: { phoneNumber: { contains: '9876543210' } } }),
          ]),
        }),
      }),
    );
  });

  it('returns document metadata without storage keys', async () => {
    const prisma = {
      kycApplication: { findUnique: jest.fn(async () => ({ id: 'kyc-1' })) },
      kycDocument: {
        findMany: jest.fn(async () => [
          {
            id: 'doc-1',
            documentType: 'PAN_CARD',
            status: 'UPLOADED',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1200,
            uploadedAt: new Date(),
            createdAt: new Date(),
          },
        ]),
      },
    };
    const service = new AdminKycService(prisma as never, { log: jest.fn() } as never, {
      getSignedDownloadUrl: jest.fn(),
    } as never);
    const result = await service.listDocuments('kyc-1');
    expect(JSON.stringify(result)).not.toMatch(/fileStorageKey|fileUrl|password/i);
    expect(result.data[0].id).toBe('doc-1');
  });

  it('rejects approve when KYC does not exist', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          kycApplication: {
            findUnique: jest.fn(async () => null),
            updateMany: jest.fn(),
          },
        }),
      ),
    };
    const service = new AdminKycService(prisma as never, { log: jest.fn() } as never, {
      getSignedDownloadUrl: jest.fn(),
    } as never);
    await expect(service.approve('missing', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a second review on an already approved application', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          kycApplication: {
            findUnique: jest.fn(async () => reviewableApp({ status: 'APPROVED' })),
            updateMany: jest.fn(),
          },
        }),
      ),
    };
    const service = new AdminKycService(prisma as never, { log: jest.fn() } as never, {
      getSignedDownloadUrl: jest.fn(),
    } as never);
    await expect(service.approve('kyc-1', admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('declines a submitted KYC, stores the reason, and writes an audit log', async () => {
    const audit = { log: jest.fn(async () => undefined) };
    const updated = {
      id: 'kyc-1',
      userId: 'cust-1',
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedBy: 'admin-1',
      declineReason: 'Document verification failed',
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          kycApplication: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce(reviewableApp())
              .mockResolvedValueOnce(updated),
            updateMany: jest.fn(async () => ({ count: 1 })),
          },
          kycVerificationDecisionRecord: { create: jest.fn(async () => ({})) },
          kycSubmissionHistory: { create: jest.fn(async () => ({})) },
        }),
      ),
    };
    const service = new AdminKycService(prisma as never, audit as never, { getSignedDownloadUrl: jest.fn() } as never);
    const result = await service.decline('kyc-1', 'Document verification failed', admin);
    expect(result.status).toBe('REJECTED');
    expect(result.declineReason).toBe('Document verification failed');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'KYC_DECLINED', isActorAdmin: true }));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          adminUserId: 'admin-1',
          kycId: 'kyc-1',
          customerId: 'cust-1',
          action: 'KYC_DECLINED',
          oldStatus: 'SUBMITTED',
          newStatus: 'REJECTED',
          reason: 'Document verification failed',
        }),
      }),
    );
  });

  it('issues a signed download URL for a document that belongs to the requested customer KYC', async () => {
    const audit = { log: jest.fn(async () => undefined) };
    const files = {
      getSignedDownloadUrl: jest.fn(async () => ({
        downloadUrl: 'https://signed.example/kyc-doc',
        expiresInSeconds: 900,
      })),
    };
    const prisma = {
      kycApplication: {
        findUnique: jest.fn(async () => ({
          id: 'kyc-1',
          userId: 'cust-1',
          user: {
            id: 'cust-1',
            deletedAt: null,
            phoneNumber: '+919876543210',
            roles: [{ role: { name: 'BORROWER' } }],
          },
        })),
      },
      kycDocument: {
        findFirst: jest.fn(async () => ({
          id: 'doc-1',
          documentType: 'AADHAAR_CARD',
          fileStorageKey: 'kyc/cust-1/kyc-1/file.png',
        })),
      },
    };
    const service = new AdminKycService(prisma as never, audit as never, files as never);
    const result = await service.getDocumentUrl('kyc-1', 'doc-1', admin);
    expect(result).toEqual({ downloadUrl: 'https://signed.example/kyc-doc', expiresInSeconds: 900 });
    expect(JSON.stringify(result)).not.toMatch(/fileStorageKey|R2_|SECRET|ACCESS_KEY|password/i);
    expect(prisma.kycDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc-1', kycApplicationId: 'kyc-1' } }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'KYC_DOCUMENT_VIEWED',
        entityId: 'doc-1',
        changedForUserId: 'cust-1',
        isActorAdmin: true,
        metadata: expect.objectContaining({
          adminUserId: 'admin-1',
          kycId: 'kyc-1',
          documentId: 'doc-1',
          action: 'KYC_DOCUMENT_VIEWED',
        }),
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toMatch(/fileStorageKey|R2_|SECRET|ACCESS_KEY/i);
  });

  it('blocks IDOR: a document from another KYC cannot be opened by guessing its id', async () => {
    const audit = { log: jest.fn(async () => undefined) };
    const files = { getSignedDownloadUrl: jest.fn() };
    const prisma = {
      kycApplication: {
        findUnique: jest.fn(async () => ({
          id: 'kyc-1',
          userId: 'cust-1',
          user: {
            id: 'cust-1',
            deletedAt: null,
            phoneNumber: '+919876543210',
            roles: [{ role: { name: 'BORROWER' } }],
          },
        })),
      },
      kycDocument: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; kycApplicationId: string } }) => {
          if (where.id === 'doc-other' && where.kycApplicationId === 'kyc-2') {
            return { id: 'doc-other', documentType: 'PAN_CARD', fileStorageKey: 'kyc/cust-2/kyc-2/file.png' };
          }
          return null;
        }),
      },
    };
    const service = new AdminKycService(prisma as never, audit as never, files as never);
    await expect(service.getDocumentUrl('kyc-1', 'doc-other', admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(files.getSignedDownloadUrl).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not issue a URL when the KYC is not tied to an actual customer', async () => {
    const audit = { log: jest.fn() };
    const files = { getSignedDownloadUrl: jest.fn() };
    const prisma = {
      kycApplication: {
        findUnique: jest.fn(async () => ({
          id: 'kyc-1',
          userId: 'staff-1',
          user: {
            id: 'staff-1',
            deletedAt: null,
            phoneNumber: null,
            roles: [{ role: { name: 'ADMIN' } }],
          },
        })),
      },
      kycDocument: { findFirst: jest.fn() },
    };
    const service = new AdminKycService(prisma as never, audit as never, files as never);
    await expect(service.getDocumentUrl('kyc-1', 'doc-1', admin)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.kycDocument.findFirst).not.toHaveBeenCalled();
    expect(files.getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('records KYC_VIEWED when an admin opens an application', async () => {
    const audit = { log: jest.fn(async () => undefined) };
    const prisma = {
      kycApplication: {
        findUnique: jest.fn(async () => ({
          ...reviewableApp(),
          referenceCode: 'KYC-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'cust-1',
            firstName: 'Aisha',
            lastName: 'Patel',
            phoneNumber: '+919876543210',
            phoneVerified: true,
            email: 'aisha@example.com',
          },
          details: null,
          documents: [],
        })),
      },
      adminUser: { findUnique: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => null) },
    };
    const service = new AdminKycService(prisma as never, audit as never, { getSignedDownloadUrl: jest.fn() } as never);
    await service.getById('kyc-1', admin);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'KYC_VIEWED',
        entityId: 'kyc-1',
        changedForUserId: 'cust-1',
        metadata: expect.objectContaining({
          adminUserId: 'admin-1',
          kycId: 'kyc-1',
          customerId: 'cust-1',
          action: 'KYC_VIEWED',
        }),
      }),
    );
  });
});
