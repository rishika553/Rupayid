import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

function schedule() {
  return {
    id: 'sch-1',
    loanApplicationId: 'loan-1',
    sequence: 1,
    dueDate: new Date('2026-09-01'),
    principalPortion: new Prisma.Decimal('8000'),
    interestPortion: new Prisma.Decimal('1000'),
    penaltyPortion: new Prisma.Decimal('0'),
    totalAmount: new Prisma.Decimal('9000'),
    paidAmount: new Prisma.Decimal('0'),
    paidAt: null,
    status: 'SCHEDULED',
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    userId: 'user-1',
    loanApplicationId: 'loan-1',
    scheduleId: 'sch-1',
    txRef: 'TXN-1',
    idempotencyKey: 'idem-1',
    method: 'UPI',
    type: 'EMI_REPAYMENT',
    amount: new Prisma.Decimal('9000'),
    currency: 'INR',
    status: 'PENDING',
    gateway: 'razorpay',
    gatewayRef: 'order_1',
    metadata: { installmentNumber: 1, keyId: 'rzp_test', amountMinor: '900000' },
    capturedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function harness() {
  const loans = [{ id: 'loan-1', userId: 'user-1', status: 'ACTIVE', applicationNumber: 'RA-1' }];
  const schedules = [schedule()];
  const payments: Array<Record<string, unknown>> = [];
  const webhookEvents: Array<Record<string, unknown>> = [];
  const repayments: Array<Record<string, unknown>> = [];
  const ledgerEntries: Array<Record<string, unknown>> = [];
  const ledgers = [
    { id: 'gl-cash', code: 'GL-003', currentBalance: new Prisma.Decimal(0) },
    { id: 'gl-recv', code: 'GL-001', currentBalance: new Prisma.Decimal(0) },
  ];

  const prisma = {
    payment: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; idempotencyKey?: string; txRef?: string } }) =>
        payments.find((row) => row.id === where.id || row.idempotencyKey === where.idempotencyKey || row.txRef === where.txRef) || null,
      ),
      findFirst: jest.fn(async ({ where }: { where: { scheduleId?: string; gatewayRef?: string } }) =>
        payments.find((row) => (where.scheduleId ? row.scheduleId === where.scheduleId : true) && (where.gatewayRef ? row.gatewayRef === where.gatewayRef : true)) || null,
      ),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => payments.filter((row) => row.userId === where.userId)),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'pay-1', createdAt: new Date(), capturedAt: null, metadata: data.metadata, ...data };
        payments.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = payments.find((item) => item.id === where.id);
        if (!row) {
          return null;
        }
        Object.assign(row, data);
        return row;
      }),
    },
    loanApplication: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => loans.find((row) => row.id === where.id) || null),
    },
    repaymentSchedule: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; loanApplicationId_sequence?: { loanApplicationId: string; sequence: number } } }) => {
        if (where.id) {
          return schedules.find((row) => row.id === where.id) || null;
        }
        return schedules.find((row) => row.loanApplicationId === where.loanApplicationId_sequence?.loanApplicationId && row.sequence === where.loanApplicationId_sequence?.sequence) || null;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = schedules.find((item) => item.id === where.id);
        Object.assign(row || {}, data);
        return row;
      }),
    },
    repayment: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        repayments.push(data);
        return data;
      }),
    },
    paymentTransaction: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
    paymentWebhookEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (webhookEvents.some((row) => row.eventId === data.eventId)) {
          const error = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' });
          throw error;
        }
        webhookEvents.push(data);
        return data;
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    ledger: {
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) => ledgers.find((row) => row.code === where.code) || null),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { currentBalance: { increment: Prisma.Decimal } } }) => {
        const row = ledgers.find((item) => item.id === where.id);
        if (row) {
          row.currentBalance = row.currentBalance.plus(data.currentBalance.increment);
        }
        return row;
      }),
    },
    ledgerEntry: {
      findFirst: jest.fn(async () => ledgerEntries[ledgerEntries.length - 1] || null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        ledgerEntries.push(data);
        return data;
      }),
    },
    $queryRaw: jest.fn(async () => []),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));

  const provider = {
    name: 'razorpay',
    createOrder: jest.fn(async () => ({
      provider: 'razorpay',
      orderId: 'order_1',
      keyId: 'rzp_test',
      amountMinor: '900000',
      currency: 'INR',
    })),
    verifyWebhook: jest.fn((body: string) => JSON.parse(body)),
  };
  const audit = { log: jest.fn() };
  const notifications = { publish: jest.fn() };
  return {
    prisma,
    provider,
    payments,
    schedules,
    repayments,
    ledgerEntries,
    svc: new PaymentsService(prisma as never, provider as never, audit as never, notifications as never),
  };
}

describe('PaymentsService', () => {
  it('creates a payment from backend outstanding and does not trust a client amount', async () => {
    const { svc, provider } = harness();
    const result = await svc.createCustomerPayment('user-1', { loanId: 'loan-1', installmentNumber: 1 });
    expect(result.amount).toBe('9000.00');
    expect(result.status).toBe('PENDING');
    expect(result.checkout?.orderId).toBe('order_1');
    expect(provider.createOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: expect.anything() }));
  });

  it('hides another customer loan and installment', async () => {
    const { svc } = harness();
    await expect(svc.createCustomerPayment('intruder', { loanId: 'loan-1', installmentNumber: 1 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getCustomerPayment('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a fully paid installment', async () => {
    const { svc, schedules } = harness();
    schedules[0].paidAmount = new Prisma.Decimal('9000');
    schedules[0].status = 'PAID';
    await expect(svc.createCustomerPayment('user-1', { loanId: 'loan-1', installmentNumber: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('settles a verified webhook once and ignores the duplicate', async () => {
    const { svc, payments, repayments, ledgerEntries, provider } = harness();
    payments.push(payment());
    provider.verifyWebhook.mockImplementation(() => ({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      orderId: 'order_1',
      providerPaymentId: 'rzp_pay_1',
      status: 'SUCCESS',
      amountMinor: '900000',
    }));
    const first = await svc.handleProviderWebhook('{}', 'sig');
    expect(first).toMatchObject({ status: 'SUCCESS', paymentId: 'pay-1' });
    expect(repayments).toHaveLength(1);
    expect(ledgerEntries.length).toBeGreaterThan(0);
    expect(payments[0].status).toBe('SUCCESS');

    provider.verifyWebhook.mockImplementation(() => ({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      orderId: 'order_1',
      status: 'SUCCESS',
      amountMinor: '900000',
    }));
    const second = await svc.handleProviderWebhook('{}', 'sig');
    expect(second).toMatchObject({ duplicate: true });
    expect(repayments).toHaveLength(1);
  });
});
