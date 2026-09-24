import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { KycService } from './kyc.service';

function prismaStub() {
  const app = {
    id: 'kyc-1',
    userId: 'user-1',
    status: 'DRAFT',
    referenceCode: 'KYC-2026-000001',
    submittedAt: null as Date | null,
    reviewedAt: null as Date | null,
    declineReason: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    details: null as null,
    documents: [] as Array<{ id: string }>,
    decisions: [] as Array<{ decision: string; reason: string }>,
    notes: 'secret',
    user: {
      id: 'user-1',
      firstName: 'Ria',
      lastName: 'Shah',
      phoneNumber: '+919000000000',
      phoneVerified: true,
      email: 'otp.9000000000@users.rupayaid.internal',
    },
  };
  return {
    app,
    prisma: {
      kycApplication: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          where.id === app.id ? app : null,
        ),
        findFirst: jest.fn(async (_args?: { where: { userId?: string } }) =>
          _args?.where.userId === app.userId ? app : null,
        ),
        findMany: jest.fn(async () => [app]),
        count: jest.fn(async () => 1),
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
        findFirst: jest.fn(async () => null as { id: string } | null),
        count: jest.fn(async () => 0),
        create: jest.fn(async () => ({ id: 'doc-new' })),
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
      statObject: jest.fn(async () => ({ sizeBytes: 1200, contentType: 'application/pdf' }) as {
        sizeBytes: number;
        contentType: string | null;
      } | null),
    },
    audit: { log: jest.fn() },
  };
}

describe('KycService ownership', () => {
  it('does not return another customer KYC on getMine', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.getMine('user-2')).rejects.toBeInstanceOf(NotFoundException);
    expect(stub.prisma.kycApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-2' } }),
    );
  });

  it('returns only the authenticated customer KYC on getMine', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const mine = await service.getMine('user-1');
    expect(mine).toHaveProperty('id', 'kyc-1');
    expect(mine).not.toHaveProperty('userId');
    expect(mine.contact).toMatchObject({ phoneNumber: '+919000000000', phoneVerified: true });
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

describe('KycService document confirmation', () => {
  const upload = {
    documentType: 'AADHAAR_CARD',
    objectKey: 'kyc/user-1/kyc-1/file.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1200,
  };

  it('records a document that exists in storage with matching size and type', async () => {
    const stub = prismaStub();
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.confirmDocument('user-1', upload)).resolves.toEqual({ id: 'doc-new' });
    expect(stub.files.statObject).toHaveBeenCalledWith(upload.objectKey);
  });

  it('rejects a key that was never uploaded', async () => {
    const stub = prismaStub();
    stub.files.statObject.mockResolvedValueOnce(null);
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.confirmDocument('user-1', upload)).rejects.toBeInstanceOf(BadRequestException);
    expect(stub.prisma.kycDocument.create).not.toHaveBeenCalled();
  });

  it('rejects when the stored size differs from the claimed size', async () => {
    const stub = prismaStub();
    stub.files.statObject.mockResolvedValueOnce({ sizeBytes: 9_999_999, contentType: 'application/pdf' });
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.confirmDocument('user-1', upload)).rejects.toBeInstanceOf(BadRequestException);
    expect(stub.prisma.kycDocument.create).not.toHaveBeenCalled();
  });

  it('rejects when the stored content type differs from the claimed type', async () => {
    const stub = prismaStub();
    stub.files.statObject.mockResolvedValueOnce({ sizeBytes: 1200, contentType: 'text/html' });
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.confirmDocument('user-1', upload)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects confirming the same upload twice', async () => {
    const stub = prismaStub();
    stub.prisma.kycDocument.findFirst.mockResolvedValueOnce({ id: 'doc-1' });
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.confirmDocument('user-1', upload)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('KycService status', () => {
  it('returns NOT_STARTED when the customer has no application', async () => {
    const stub = prismaStub();
    stub.prisma.kycApplication.findFirst.mockResolvedValue(null);
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

  it('returns APPROVED from the database after review', async () => {
    const stub = prismaStub();
    stub.app.status = 'APPROVED';
    stub.app.reviewedAt = new Date('2026-09-11T08:00:00.000Z');
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const status = await service.getStatus('user-1');
    expect(status).toMatchObject({
      status: 'APPROVED',
      canEdit: false,
      canSubmit: false,
      reason: null,
    });
  });

  it('returns the admin decline reason for a rejected application', async () => {
    const stub = prismaStub();
    stub.app.status = 'REJECTED';
    stub.app.declineReason = 'Aadhaar photo is unreadable';
    stub.app.decisions = [];
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    const status = await service.getStatus('user-1');
    expect(status.status).toBe('REJECTED');
    expect(status.reason).toBe('Aadhaar photo is unreadable');
    expect(status.canEdit).toBe(false);
  });

  it('forbids the customer from editing KYC after it is submitted', async () => {
    const stub = prismaStub();
    stub.app.status = 'SUBMITTED';
    const service = new KycService(stub.prisma as never, stub.files as never, stub.audit as never);
    await expect(service.updateMine('user-1', {} as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
