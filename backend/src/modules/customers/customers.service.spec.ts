import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

function baseUser() {
  return {
    id: 'user-1',
    firstName: 'Ria',
    lastName: 'Shah',
    middleName: null,
    email: 'otp.9000000000@users.rupayaid.internal',
    emailVerified: false,
    phoneNumber: '+919000000000',
    phoneVerified: true,
    status: 'ACTIVE',
    referralCode: 'RIA12ABC',
    createdAt: new Date('2026-01-01'),
    profile: {
      dateOfBirth: null,
      gender: null,
      occupation: 'Salaried',
      yearlyIncome: { toFixed: () => '600000.00' },
      addressLine1: null,
      addressLine2: null,
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      panLastFour: null,
      aadhaarLastFour: null,
      hasKycCompleted: false,
    },
    kycApplications: [] as Array<Record<string, unknown>>,
  };
}

function prismaStub(user = baseUser()) {
  return {
    user,
    prisma: {
      user: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
          where.id === user.id ? user : null,
        ),
        findFirst: jest.fn(async (): Promise<{ id: string } | null> => null),
        update: jest.fn(),
      },
      customerProfile: {
        upsert: jest.fn(),
      },
      kycDetails: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user: { update: jest.fn() },
          customerProfile: { upsert: jest.fn() },
          kycDetails: { upsert: jest.fn() },
        }),
      ),
    },
    audit: { log: jest.fn() },
  };
}

describe('CustomersService', () => {
  it('returns the caller profile without database ids or internal email', async () => {
    const stub = prismaStub();
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    const result = await service.getMine('user-1');
    expect(result).not.toHaveProperty('id');
    expect(result.contact.email).toBeNull();
    expect(result.contact.phoneNumber).toBe('+919000000000');
    expect(result.personal.firstName).toBe('Ria');
    expect(result.kyc.status).toBe('NOT_STARTED');
  });

  it('does not return another customer when the id does not match', async () => {
    const stub = prismaStub();
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    await expect(service.getMine('user-2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects under-18 date of birth', async () => {
    const stub = prismaStub();
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    await expect(service.updateMine('user-1', { dateOfBirth: '2015-01-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('blocks identity edits after KYC is submitted', async () => {
    const user = baseUser();
    user.kycApplications = [{ id: 'kyc-1', status: 'SUBMITTED', details: null }];
    const stub = prismaStub(user);
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    await expect(service.updateMine('user-1', { panLastFour: '1234' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an email already used by another customer', async () => {
    const stub = prismaStub();
    stub.prisma.user.findFirst = jest.fn(async () => ({ id: 'other' }));
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    await expect(service.updateMine('user-1', { email: 'taken@example.com' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('audits important profile changes', async () => {
    const stub = prismaStub();
    const service = new CustomersService(stub.prisma as never, stub.audit as never);
    await service.updateMine('user-1', { firstName: 'Riya', city: 'Mumbai' });
    expect(stub.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'PROFILE_UPDATED',
        changedById: 'user-1',
        diffSummary: { fields: expect.arrayContaining(['firstName', 'city']) },
      }),
    );
  });
});
