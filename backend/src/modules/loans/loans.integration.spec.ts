import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { LoanProductsService } from '../loan-products/loan-products.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

describe('LoansController customer integration', () => {
  const product = {
    id: 'prod-1',
    isActive: true,
    minAmount: new Prisma.Decimal('50000'),
    maxAmount: new Prisma.Decimal('200000'),
    minTenureMonths: 6,
    maxTenureMonths: 12,
    baseInterestRate: new Prisma.Decimal('0.12'),
    processingFeeRate: new Prisma.Decimal('0.01'),
    rules: {},
  };
  const apps: Array<Record<string, unknown>> = [];

  const prisma = {
    loanApplication: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; idempotencyKey?: string; applicationNumber?: string } }) =>
        apps.find((row) => row.id === where.id || row.idempotencyKey === where.idempotencyKey || row.applicationNumber === where.applicationNumber) || null,
      ),
      findFirst: jest.fn(async ({ where }: { where: { id?: string; userId?: string } }) =>
        apps.find((row) => (where.id ? row.id === where.id : true) && (where.userId ? row.userId === where.userId : true)) || null,
      ),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => apps.filter((row) => row.userId === where.userId)),
      count: jest.fn(async () => apps.length),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: 'app-int-1',
          applicationNumber: data.applicationNumber,
          userId: data.userId,
          loanProductId: data.loanProductId,
          amountRequested: data.amountRequested,
          tenureMonths: data.tenureMonths,
          interestRate: data.interestRate,
          processingFee: data.processingFee,
          status: data.status,
          currentState: data.currentState,
          metadata: data.metadata,
          submittedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          idempotencyKey: data.idempotencyKey,
          loanProduct: product,
          stateEvents: [],
        };
        apps.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = apps.find((item) => item.id === where.id);
        Object.assign(row || {}, data);
        return row;
      }),
    },
    loanApplicationStateEvent: { create: jest.fn(async ({ data }: { data: unknown }) => data) },
    loanProduct: { findUnique: jest.fn(async () => product) },
    kycApplication: { findFirst: jest.fn(async () => ({ status: 'APPROVED' })) },
    systemSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    eligibilityEvaluation: { update: jest.fn(async () => ({})) },
    usersOnRoles: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(async () => [{ id: 'app-int-1' }]),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (client: unknown) => Promise<unknown>)(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });

  const user = { id: 'user-1', email: 'a@b.c' };
  let controller: LoansController;

  beforeEach(async () => {
    apps.length = 0;
    const moduleRef = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        LoansService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: EligibilityService,
          useValue: {
            evaluate: jest.fn(async () => ({
              reference: 'eval-int',
              eligible: true,
              status: 'ELIGIBLE',
              reason: 'ok',
            })),
          },
        },
        { provide: LoanProductsService, useValue: { isOfferedToCustomers: () => true } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    controller = moduleRef.get(LoansController);
  });

  it('creates, lists, loads, and submits an owned application', async () => {
    const created = await controller.createApplication(
      user,
      { loanProductId: 'prod-1', amountRequested: 80000, tenureMonths: 8 },
      { headers: {}, ip: '127.0.0.1' } as never,
    );
    expect(created.status).toBe('DRAFT');

    const listed = await controller.listMine(user);
    expect(listed).toHaveLength(1);

    const loaded = await controller.findOne('app-int-1', user);
    expect(loaded.id).toBe('app-int-1');

    const submitted = await controller.submit(
      'app-int-1',
      {},
      user,
      { headers: {}, ip: '127.0.0.1' } as never,
    );
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.eligibilityReference).toBe('eval-int');
  });

  it('returns 404 for another customer and refuses privileged patches', async () => {
    await controller.createApplication(
      user,
      { loanProductId: 'prod-1', amountRequested: 80000, tenureMonths: 8 },
      { headers: {}, ip: '127.0.0.1' } as never,
    );
    await expect(controller.findOne('app-int-1', { id: 'intruder', email: 'x@y.z' })).rejects.toBeDefined();
    await expect(
      controller.update('app-int-1', { status: 'APPROVED' as never }, user, { headers: {}, ip: '127.0.0.1' } as never),
    ).rejects.toBeDefined();
  });
});
