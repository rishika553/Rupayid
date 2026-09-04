import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { KycService } from './kyc.service';

function prismaStub() {
  const app = {
    id: 'kyc-1',
    userId: 'user-1',
    status: 'DRAFT',
    referenceCode: 'KYC-2026-000001',
    submittedAt: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    details: null,
    documents: [],
    decisions: [],
    notes: 'secret',
  };
  return {
    app,
    prisma: {
      kycApplication: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          where.id === app.id ? { ...app, user: { id: app.userId } } : null,
        ),
        findFirst: jest.fn(async ({ where }: { where: { userId?: string } }) =>
          where.userId === app.userId ? app : null,
        ),
      },
      kycDocument: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id !== 'doc-1') {
            return null;
          }
          return {
            id: 'doc-1',
            fileStorageKey: 'kyc/user-1/kyc-1/file.pdf',
            kycApplication: { userId: 'user-1' },
          };
        }),
        create: jest.fn(),
      },
      usersOnRoles: {
        findMany: jest.fn(async () => []),
      },
    },
    files: {
      getSignedDownloadUrl: jest.fn(async () => ({
        downloadUrl: 'https://signed.example/x',
        expiresInSeconds: 900,
      })),
      keyBelongsToUser: (key: string, userId: string) =>
        Boolean(key) && !key.includes('..') && key.startsWith(`kyc/${userId}/`),
      assertAllowedUpload: jest.fn(),
    },
    audit: { log: jest.fn() },
  };
}

describe('KycService ownership', () => {
  it('forbids loading another customer KYC by id', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.findById('kyc-1', 'user-2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows the owner to load their KYC by id', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const result = await service.findById('kyc-1', 'user-1');
    expect(result).toHaveProperty('id', 'kyc-1');
    expect(result).not.toHaveProperty('notes');
    expect(result).not.toHaveProperty('userId');
  });

  it('forbids document download for another customer', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.getDocumentDownloadUrl('user-2', 'doc-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(stub.files.getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('returns not found for a missing document rather than leaking existence across users', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.getDocumentDownloadUrl('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids confirming a document whose object key belongs to another customer', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(
      service.confirmDocument('user-1', {
        documentType: 'AADHAAR_CARD',
        objectKey: 'kyc/user-2/kyc-1/file.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1200,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(stub.prisma.kycDocument.create).not.toHaveBeenCalled();
  });
});

describe('KycService status', () => {
  it('returns NOT_STARTED when the customer has no application', async () => {
    const stub = prismaStub();
    stub.prisma.kycApplication.findFirst = jest.fn(async () => null);
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const status = await service.getStatus('user-1');
    expect(status).toMatchObject({
      status: 'NOT_STARTED',
      exists: false,
      canSubmit: false,
      reason: null,
    });
  });

  it('returns the reviewer reason for resubmission', async () => {
    const stub = prismaStub();
    stub.app.status = 'RESUBMISSION_REQUIRED';
    stub.app.decisions = [
      { decision: 'REQUESTED_MORE_INFO', reason: 'Address proof is unclear' },
    ];
    stub.app.documents = [{ id: 'doc-1' }];
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const status = await service.getStatus('user-1');
    expect(status.status).toBe('RESUBMISSION_REQUIRED');
    expect(status.reason).toBe('Address proof is unclear');
    expect(status.canEdit).toBe(true);
  });
});
