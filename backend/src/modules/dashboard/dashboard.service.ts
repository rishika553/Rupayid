import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { summarizeSchedule } from '../loans/repayment-schedule';
import { OPEN_STATES } from '../loans/loan-application.state';

const ACTIVE_LOAN_STATES = ['DISBURSED', 'ACTIVE'] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerDashboard(userId: string) {
    const [
      customer,
      activeLoan,
      referralCounts,
      unreadCount,
    ] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            referralCode: true,
            kycApplications: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { id: true, status: true },
            },
            referralsTaken: {
              take: 1,
              select: {
                status: true,
                referrer: { select: { firstName: true } },
              },
            },
            loanApplications: {
              where: { status: { in: [...OPEN_STATES] } },
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                applicationNumber: true,
                status: true,
                amountRequested: true,
                createdAt: true,
                loanProduct: { select: { name: true } },
              },
            },
            Payment: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                id: true,
                txRef: true,
                amount: true,
                currency: true,
                method: true,
                type: true,
                status: true,
                createdAt: true,
              },
            },
          },
        }),
        this.prisma.loanApplication.findFirst({
          where: { userId, status: { in: [...ACTIVE_LOAN_STATES] } },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            amountRequested: true,
            tenureMonths: true,
            loanProduct: { select: { name: true } },
            approvals: {
              where: { decision: 'APPROVED' },
              take: 1,
              orderBy: { approvedAt: 'desc' },
              select: { approvedAmount: true },
            },
            repaymentSchedule: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                sequence: true,
                dueDate: true,
                principalPortion: true,
                interestPortion: true,
                penaltyPortion: true,
                totalAmount: true,
                paidAmount: true,
                status: true,
              },
            },
          },
        }),
        this.prisma.referral.groupBy({
          by: ['status'],
          where: { referrerId: userId },
          _count: { _all: true },
        }),
        this.prisma.notification.count({
          where: { userId, type: 'INAPP', readAt: null },
        }),
      ]);

    if (!customer) throw new NotFoundException('Customer not found');

    const latestKyc = customer.kycApplications[0];
    const currentApplication = customer.loanApplications[0];
    const kyc = kycSummary(latestKyc?.status);
    const schedule = activeLoan
      ? summarizeSchedule(activeLoan.repaymentSchedule)
      : null;
    const approvedAmount =
      activeLoan?.approvals[0]?.approvedAmount ?? activeLoan?.amountRequested;
    const referredCount = referralCounts.reduce(
      (total, group) => total + group._count._all,
      0,
    );
    const convertedCount =
      referralCounts.find((group) => group.status === 'CONVERTED')?._count._all ??
      0;

    return {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName}`.trim(),
      },
      kyc: {
        id: latestKyc?.id || null,
        ...kyc,
      },
      loan: {
        currentApplication: currentApplication
          ? {
              id: currentApplication.id,
              applicationNumber: currentApplication.applicationNumber,
              productName: currentApplication.loanProduct.name,
              status: currentApplication.status,
              requestedAmount: money(currentApplication.amountRequested),
              appliedAt: currentApplication.createdAt,
            }
          : null,
        activeLoan: activeLoan
          ? {
              id: activeLoan.id,
              applicationNumber: activeLoan.applicationNumber,
              productName: activeLoan.loanProduct.name,
              status: activeLoan.status,
              approvedAmount: money(approvedAmount),
              tenureMonths: activeLoan.tenureMonths,
              outstandingAmount: schedule?.totals.outstanding || '0.00',
            }
          : null,
      },
      repayment: {
        nextInstallment: schedule?.nextPayment
          ? {
              installmentNumber: schedule.nextPayment.installmentNumber,
              dueDate: schedule.nextPayment.dueDate,
              amountDue: schedule.nextPayment.outstanding,
              paymentStatus: schedule.nextPayment.status,
            }
          : null,
      },
      payments: {
        recent: customer.Payment.map((payment) => ({
          id: payment.id,
          reference: payment.txRef,
          amount: money(payment.amount),
          currency: payment.currency,
          method: payment.method,
          type: payment.type,
          status: payment.status,
          createdAt: payment.createdAt,
        })),
      },
      referral: {
        code: customer.referralCode,
        referredCount,
        convertedCount,
        referredBy: customer.referralsTaken[0]?.referrer.firstName || null,
      },
      notifications: { unreadCount },
    };
  }
}

function money(value: Prisma.Decimal | string | number | null | undefined) {
  return new Prisma.Decimal(value == null ? 0 : value).toFixed(2);
}

function kycSummary(status?: string) {
  if (status === 'APPROVED') {
    return {
      status,
      actionRequired: false,
      actionLabel: null,
      actionHref: '/kyc/status',
    };
  }
  if (['SUBMITTED', 'UNDER_REVIEW'].includes(status || '')) {
    return {
      status,
      actionRequired: false,
      actionLabel: 'View KYC status',
      actionHref: '/kyc/status',
    };
  }
  if (['REJECTED', 'MORE_INFO_REQUIRED'].includes(status || '')) {
    return {
      status: status!,
      actionRequired: true,
      actionLabel: 'View KYC status',
      actionHref: '/kyc/status',
    };
  }
  return {
    status: status || 'NOT_STARTED',
    actionRequired: true,
    actionLabel: status ? 'Complete KYC' : 'Start KYC',
    actionHref: '/kyc',
  };
}
