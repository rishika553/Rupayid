import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LoansService } from './loans.service';

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

function draft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    userId: 'user-1',
    loanProductId: 'prod-1',
    applicationNumber: 'RA-2026-000001',
    amountRequested: new Prisma.Decimal('100000'),
    tenureMonths: 12,
    interestRate: new Prisma.Decimal('0.12'),
    processingFee: new Prisma.Decimal('1000'),
    status: 'DRAFT',
    currentState: 'DRAFT',
    metadata: { costBreakdown: { amount: '100000.00' } },
    submittedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    idempotencyKey: null,
    loanProduct: product,
    stateEvents: [],
    ...overrides,
  };
}

function harness(seed: { apps?: Array<Record<string, unknown>>; kycStatus?: string | null } = {}) {
  const apps = seed.apps || [];
  const events: Array<Record<string, unknown>> = [];
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
        const row = { ...draft(), ...data, id: data.id || `app-${apps.length + 1}`, stateEvents: [] };
        apps.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = apps.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data);
        return row;
      }),
    },
    loanApplicationStateEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        events.push(data);
        return data;
      }),
    },
    loanProduct: {
      findUnique: jest.fn(async () => product),
    },
    kycApplication: {
      findFirst: jest.fn(async () => (seed.kycStatus === null ? null : { status: seed.kycStatus || 'APPROVED' })),
    },
    systemSetting: {
      findUnique: jest.fn(async () => ({ value: true })),
    },
    eligibilityEvaluation: {
      update: jest.fn(async () => ({})),
    },
    usersOnRoles: {
      findMany: jest.fn(async () => []),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(async () => [{ id: 'app-1' }]),
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
  const eligibility = {
    evaluate: jest.fn(async () => ({
      reference: 'eval-1',
      eligible: true,
      status: 'ELIGIBLE',
      reason: 'You meet the current checks for this product.',
    })),
  };
  const loanProducts = {
    isOfferedToCustomers: jest.fn(() => true),
  };
  const audit = { log: jest.fn() };
  return {
    apps,
    events,
    eligibility,
    audit,
    prisma,
    svc: new LoansService(prisma as never, eligibility as never, loanProducts as never, audit as never),
  };
}

describe('LoansService customer flow', () => {
  it('creates a draft with a server-side cost breakdown', async () => {
    const { svc, apps, audit } = harness();
    const result = await svc.createApplication('user-1', {
      loanProductId: 'prod-1',
      amountRequested: 100000,
      tenureMonths: 12,
    });
    expect(result.status).toBe('DRAFT');
    expect((result as { costBreakdown?: { amount: string; processingFee: string } }).costBreakdown).toMatchObject({
      amount: '100000.00',
      processingFee: '1000.00',
    });
    expect(apps[0].status).toBe('DRAFT');
    expect(audit.log).toHaveBeenCalled();
  });

  it('rejects amounts outside the product range', async () => {
    const { svc } = harness();
    await expect(
      svc.createApplication('user-1', { loanProductId: 'prod-1', amountRequested: 1000, tenureMonths: 12 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses an idempotent create', async () => {
    const existing = draft({ idempotencyKey: 'key-1' });
    const { svc } = harness({ apps: [existing] });
    const result = await svc.createApplication(
      'user-1',
      { loanProductId: 'prod-1', amountRequested: 100000, tenureMonths: 12 },
      { idempotencyKey: 'key-1' },
    );
    expect(result.id).toBe('app-1');
  });

  it('blocks a second open application', async () => {
    const { svc } = harness({ apps: [draft({ loanProductId: 'prod-2' })] });
    await expect(
      svc.createApplication('user-1', { loanProductId: 'prod-1', amountRequested: 100000, tenureMonths: 12 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hides another customer application', async () => {
    const { svc } = harness({ apps: [draft({ userId: 'other' })] });
    await expect(svc.getApplication('app-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not allow a customer patch to approve', async () => {
    const { svc } = harness({ apps: [draft()] });
    await expect(
      svc.updateApplication('app-1', 'user-1', { status: 'APPROVED' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires KYC before submit', async () => {
    const { svc } = harness({ apps: [draft()], kycStatus: 'DRAFT' });
    await expect(svc.submitApplication('app-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires eligibility before submit', async () => {
    const { svc, eligibility } = harness({ apps: [draft()], kycStatus: 'APPROVED' });
    eligibility.evaluate.mockResolvedValueOnce({
      reference: 'eval-2',
      eligible: false,
      status: 'NOT_ELIGIBLE',
      reason: 'Your income does not meet the requirement for this product.',
    });
    await expect(svc.submitApplication('app-1', 'user-1')).rejects.toMatchObject({
      message: 'Your income does not meet the requirement for this product.',
    });
  });

  it('submits once and replays the second submit', async () => {
    const { svc, apps, events } = harness({ apps: [draft()], kycStatus: 'APPROVED' });
    const first = await svc.submitApplication('app-1', 'user-1');
    expect(first.status).toBe('SUBMITTED');
    expect(events.map((event) => event.toState)).toEqual(['ELIGIBILITY_CHECK', 'SUBMITTED']);
    apps[0].status = 'SUBMITTED';
    apps[0].currentState = 'SUBMITTED';
    const second = await svc.submitApplication('app-1', 'user-1');
    expect(second.status).toBe('SUBMITTED');
  });

  it('returns only the owner loan with a customer-safe tracking payload', async () => {
    const due = new Date('2026-10-01');
    const { svc } = harness({
      apps: [
        draft({
          status: 'ACTIVE',
          currentState: 'ACTIVE',
          submittedAt: new Date('2026-09-01'),
          approvals: [
            {
              decision: 'APPROVED',
              approvedAmount: new Prisma.Decimal('90000'),
              approvedTenure: 10,
              approvedAt: new Date('2026-09-02'),
            },
          ],
          disbursements: [{ status: 'SUCCESS', successAt: new Date('2026-09-03'), amount: new Prisma.Decimal('90000') }],
          repaymentSchedule: [
            {
              id: 'emi-1',
              sequence: 1,
              dueDate: due,
              principalPortion: new Prisma.Decimal('8000'),
              interestPortion: new Prisma.Decimal('1000'),
              penaltyPortion: new Prisma.Decimal('0'),
              totalAmount: new Prisma.Decimal('9000'),
              paidAmount: new Prisma.Decimal('0'),
              status: 'SCHEDULED',
            },
          ],
          payments: [
            {
              id: 'pay-1',
              txRef: 'TX-1',
              method: 'UPI',
              type: 'REPAYMENT',
              direction: 'INFLOW',
              status: 'SUCCESS',
              amount: new Prisma.Decimal('9000'),
              capturedAt: new Date('2026-09-10'),
              createdAt: new Date('2026-09-10'),
              metadata: { internalScore: 12 },
              refusalReason: 'secret',
            },
          ],
          stateEvents: [{ fromState: 'UNDER_REVIEW', toState: 'APPROVED', reason: 'internal note', createdAt: new Date() }],
        }),
      ],
    });
    const loan = await svc.getTrackedLoan('app-1', 'user-1');
    expect(loan.approvedAmount).toBe('90000');
    expect(loan.tenureMonths).toBe(10);
    expect(loan.outstandingAmount).toBe('9000.00');
    expect(loan.nextRepayment?.amount).toBe('9000.00');
    expect(loan.nextRepayment?.status).toBe('UPCOMING');
    expect(loan.schedule?.[0]).toMatchObject({
      installmentNumber: 1,
      principal: '8000.00',
      interest: '1000.00',
      fees: '0.00',
      outstanding: '9000.00',
      status: 'UPCOMING',
    });
    expect(loan.disbursementDate).toBeTruthy();
    expect(JSON.stringify(loan)).not.toMatch(/internal note|internalScore|secret|note/);
    await expect(svc.getTrackedLoan('app-1', 'intruder')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a customer repayment schedule only to the owner', async () => {
    const { svc } = harness({
      apps: [
        draft({
          status: 'ACTIVE',
          repaymentSchedule: [
            {
              id: 'emi-1',
              sequence: 1,
              dueDate: new Date('2026-08-01T00:00:00.000Z'),
              principalPortion: new Prisma.Decimal('8000'),
              interestPortion: new Prisma.Decimal('1000'),
              penaltyPortion: new Prisma.Decimal('0'),
              totalAmount: new Prisma.Decimal('9000'),
              paidAmount: new Prisma.Decimal('0'),
              status: 'PAST_DUE',
            },
          ],
        }),
      ],
    });
    const schedule = await svc.getRepaymentSchedule('app-1', 'user-1');
    expect(schedule.installments[0].status).toBe('OVERDUE');
    expect(schedule.nextPayment?.outstanding).toBe('9000.00');
    expect(schedule.totals.outstanding).toBe('9000.00');
    await expect(svc.getRepaymentSchedule('app-1', 'intruder')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getRepaymentSchedule('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
