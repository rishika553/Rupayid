import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';

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
      findUnique: jest.fn(async () =>
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
      findFirst: jest.fn(async () => activeLoan),
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
    expect(prisma.loanApplication.findFirst).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the authenticated customer no longer exists', async () => {
    const { service } = harness({ missingUser: true });
    await expect(service.getCustomerDashboard('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
