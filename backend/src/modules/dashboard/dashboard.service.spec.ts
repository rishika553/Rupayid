import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';

type DashboardUser = {
  firstName: string;
  lastName: string;
  referralCode: string;
  kycApplications: Array<{ id: string; status: string }>;
  referralsTaken: unknown[];
  loanApplications: Array<{
    id: string;
    applicationNumber: string;
    status: string;
    amountRequested: Prisma.Decimal;
    createdAt: Date;
    loanProduct: { name: string };
  }>;
  Payment: Array<{
    id: string;
    txRef: string;
    amount: Prisma.Decimal;
    currency: string;
    method: string;
    type: string;
    status: string;
    createdAt: Date;
  }>;
};

type DashboardLoan = {
  id: string;
  applicationNumber: string;
  status: string;
  amountRequested: Prisma.Decimal;
  tenureMonths: number;
  updatedAt: Date;
  loanProduct: { name: string };
  approvals: Array<{ approvedAmount: Prisma.Decimal }>;
  repaymentSchedule: Array<{
    id: string;
    sequence: number;
    dueDate: Date;
    principalPortion: Prisma.Decimal;
    interestPortion: Prisma.Decimal;
    penaltyPortion: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    status: string;
  }>;
};

function harness(options?: { missingUser?: boolean }) {
  const currentApplication = {
    id: 'application-1',
    applicationNumber: 'RA-2026-1',
    status: 'SUBMITTED',
    amountRequested: new Prisma.Decimal('100000'),
    createdAt: new Date('2026-09-01'),
    loanProduct: { name: 'Personal Loan' },
  };
  const activeLoan = {
    id: 'loan-1',
    applicationNumber: 'RA-2026-2',
    status: 'ACTIVE',
    amountRequested: new Prisma.Decimal('90000'),
    tenureMonths: 10,
    updatedAt: new Date(),
    loanProduct: { name: 'Flexi Loan' },
    approvals: [{ approvedAmount: new Prisma.Decimal('85000') }],
    repaymentSchedule: [
      {
        id: 'schedule-1',
        sequence: 1,
        dueDate: new Date('2099-10-01'),
        principalPortion: new Prisma.Decimal('8000'),
        interestPortion: new Prisma.Decimal('1000'),
        penaltyPortion: new Prisma.Decimal('0'),
        totalAmount: new Prisma.Decimal('9000'),
        paidAmount: new Prisma.Decimal('1000'),
        status: 'PARTIALLY_PAID',
      },
    ],
  };
  const prisma = {
    user: {
      findUnique: jest.fn(
        async (_args?: { where: { id: string } }): Promise<DashboardUser | null> =>
          options?.missingUser
            ? null
            : {
                firstName: 'Rishika',
                lastName: 'Customer',
                referralCode: 'RAP-ABCD1234',
                kycApplications: [{ id: 'kyc-1', status: 'DRAFT' }],
                referralsTaken: [],
                loanApplications: [currentApplication],
                Payment: [
                  {
                    id: 'payment-1',
                    txRef: 'TXN-1',
                    amount: new Prisma.Decimal('1000'),
                    currency: 'INR',
                    method: 'UPI',
                    type: 'EMI_REPAYMENT',
                    status: 'SUCCESS',
                    createdAt: new Date('2026-09-05'),
                  },
                ],
              },
      ),
    },
    loanApplication: {
      findFirst: jest.fn(
        async (_args?: { where: { userId: string } }): Promise<DashboardLoan | null> => activeLoan,
      ),
    },
    referral: {
      groupBy: jest.fn(async () => [
        { status: 'ACCEPTED', _count: { _all: 1 } },
        { status: 'CONVERTED', _count: { _all: 1 } },
      ]),
    },
    notification: { count: jest.fn(async () => 3) },
  };
  return { service: new DashboardService(prisma as never), prisma };
}

describe('DashboardService', () => {
  it('returns a customer-safe operational snapshot with server balances', async () => {
    const { service, prisma } = harness();
    const result = await service.getCustomerDashboard('user-1');
    expect(result.customer.fullName).toBe('Rishika Customer');
    expect(result.kyc).toMatchObject({ status: 'DRAFT', actionRequired: true });
    expect(result.loan.activeLoan).toMatchObject({
      approvedAmount: '85000.00',
      outstandingAmount: '8000.00',
    });
    expect(result.repayment.nextInstallment).toMatchObject({
      installmentNumber: 1,
      amountDue: '8000.00',
      paymentStatus: 'PARTIALLY_PAID',
    });
    expect(result.payments.recent[0].amount).toBe('1000.00');
    expect(result.referral).toMatchObject({ referredCount: 2, convertedCount: 1 });
    expect(result.notifications.unreadCount).toBe(3);
    expect(prisma.loanApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
    expect(prisma.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
    expect(prisma.referral.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { referrerId: 'user-1' },
      }),
    );
  });

  it('loads dashboard rows only for the authenticated customer', async () => {
    const { service, prisma } = harness();
    prisma.user.findUnique.mockImplementation(async (args?: { where: { id: string } }) =>
      args?.where.id === 'user-2'
        ? {
            firstName: 'Other',
            lastName: 'Customer',
            referralCode: 'RAP-OTHER000',
            kycApplications: [{ id: 'kyc-2', status: 'APPROVED' }],
            referralsTaken: [],
            loanApplications: [],
            Payment: [],
          }
        : null,
    );
    prisma.loanApplication.findFirst.mockResolvedValue(null);
    const result = await service.getCustomerDashboard('user-2');
    expect(result.customer.fullName).toBe('Other Customer');
    expect(result.kyc.id).toBe('kyc-2');
    expect(result.loan.activeLoan).toBeNull();
    expect(result.kyc.id).not.toBe('kyc-1');
    expect(prisma.loanApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) }),
    );
  });

  it('returns 404 when the authenticated customer no longer exists', async () => {
    const { service } = harness({ missingUser: true });
    await expect(service.getCustomerDashboard('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
