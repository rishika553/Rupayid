import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { LoansService } from '../loans/loans.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepaymentsService } from '../repayments/repayments.service';

const PENDING_LOAN = ['SUBMITTED', 'ELIGIBILITY_CHECK', 'UNDER_REVIEW'] as const;

function money(value: unknown): string {
  if (value == null) {
    return '0.00';
  }
  return new Prisma.Decimal(String(value)).toFixed(2);
}

function displayName(user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'Customer';
}

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loans: LoansService,
    private readonly disbursements: DisbursementsService,
    private readonly repayments: RepaymentsService,
  ) {}

  async getOpsStats() {
    const [loanTotal, loanPending, loanApproved, loanRejected, disbPending, disbSuccess, overdueCount] =
      await Promise.all([
        this.prisma.loanApplication.count({ where: { status: { not: 'DRAFT' } } }),
        this.prisma.loanApplication.count({ where: { status: { in: [...PENDING_LOAN] } } }),
        this.prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
        this.prisma.loanApplication.count({ where: { status: 'REJECTED' } }),
        this.prisma.loanDisbursement.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
        this.prisma.loanDisbursement.count({ where: { status: 'SUCCESS' } }),
        this.prisma.repaymentSchedule.count({
          where: { status: { in: ['SCHEDULED', 'PAST_DUE'] }, dueDate: { lt: new Date() } },
        }),
      ]);

    return {
      loans: {
        total: loanTotal,
        pendingReview: loanPending,
        approved: loanApproved,
        rejected: loanRejected,
      },
      disbursements: { pending: disbPending, success: disbSuccess },
      overdueCount,
    };
  }

  async listLoans(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const where = this.buildLoanWhere(query.status, query.search);
    const [rows, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
          loanProduct: { select: { id: true, name: true } },
        },
      }),
      this.prisma.loanApplication.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        applicationNumber: row.applicationNumber,
        status: row.status,
        amountRequested: money(row.amountRequested),
        tenureMonths: row.tenureMonths,
        submittedAt: row.submittedAt,
        createdAt: row.createdAt,
        productName: row.loanProduct?.name || 'Loan',
        customerName: displayName(row.user),
        mobile: row.user?.phoneNumber || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getLoan(id: string) {
    const app = await this.loans.findById(id);
    const approval = app.approvals.find((row) => row.decision === 'APPROVED') || app.approvals[0];
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      currentState: app.currentState,
      amountRequested: money(app.amountRequested),
      tenureMonths: app.tenureMonths,
      interestRate: String(app.interestRate),
      processingFee: money(app.processingFee),
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      product: app.loanProduct ? { id: app.loanProduct.id, name: app.loanProduct.name } : null,
      customer: {
        id: app.user.id,
        name: displayName(app.user),
        email: app.user.email,
      },
      approval: approval
        ? {
            decision: approval.decision,
            approvedAmount: approval.approvedAmount == null ? null : money(approval.approvedAmount),
            approvedTenure: approval.approvedTenure,
            approvedInterest: approval.approvedInterest == null ? null : String(approval.approvedInterest),
            reason: approval.reason,
            approvedAt: approval.approvedAt,
            approvedByName: approval.approvedByName,
          }
        : null,
      disbursements: app.disbursements.map((row) => ({
        id: row.id,
        amount: money(row.amount),
        method: row.method,
        status: row.status,
        providerReference: row.providerReference,
        successAt: row.successAt,
        createdAt: row.createdAt,
        beneficiaryBankName: row.beneficiaryBankName,
        beneficiaryAccount: row.beneficiaryAccount,
        beneficiaryIfsc: row.beneficiaryIfsc,
      })),
      schedule: app.repaymentSchedule.map((row) => ({
        id: row.id,
        sequence: row.sequence,
        dueDate: row.dueDate,
        totalAmount: money(row.totalAmount),
        paidAmount: money(row.paidAmount),
        status: row.status,
      })),
      timeline: app.stateEvents.map((event) => ({
        fromState: event.fromState,
        toState: event.toState,
        reason: event.reason,
        createdAt: event.createdAt,
      })),
    };
  }

  async approveLoan(id: string, dto: AdminLoanApproveDtoLike, admin: CurrentAdminPayload) {
    const app = await this.loans.findById(id);
    if (app.currentState === 'SUBMITTED' || app.currentState === 'ELIGIBILITY_CHECK') {
      await this.loans.transitionState(id, 'UNDER_REVIEW', this.actorId(admin), 'Moved to review');
    }
    return this.loans.approve(id, {
      approvedAmount: dto.approvedAmount,
      approvedTenure: dto.approvedTenure,
      approvedInterest: dto.approvedInterest,
      reason: dto.reason,
      approvedById: this.actorId(admin),
      approvedByName: admin.username,
    });
  }

  async rejectLoan(id: string, reason: string, admin: CurrentAdminPayload) {
    const app = await this.loans.findById(id);
    if (app.currentState === 'SUBMITTED' || app.currentState === 'ELIGIBILITY_CHECK') {
      await this.loans.transitionState(id, 'UNDER_REVIEW', this.actorId(admin), 'Moved to review');
    }
    return this.loans.reject(id, { reason, rejectedById: this.actorId(admin) });
  }

  async listDisbursements(loanApplicationId?: string) {
    const rows = await this.disbursements.findAll(loanApplicationId);
    return rows.map((row) => ({
      id: row.id,
      loanApplicationId: row.loanApplicationId,
      applicationNumber: row.loanApplication?.applicationNumber || null,
      amount: money(row.amount),
      method: row.method,
      status: row.status,
      providerReference: row.providerReference,
      createdAt: row.createdAt,
      successAt: row.successAt,
    }));
  }

  async initiateDisbursement(dto: AdminDisburseDtoLike, admin: CurrentAdminPayload) {
    const app = await this.loans.findById(dto.loanApplicationId);
    if (!['APPROVED', 'DISBURSEMENT_PENDING'].includes(app.currentState)) {
      throw new BadRequestException(`Cannot disburse a loan in ${app.currentState}`);
    }
    if (app.currentState === 'APPROVED') {
      await this.loans.transitionState(
        app.id,
        'DISBURSEMENT_PENDING',
        this.actorId(admin),
        'Disbursement initiated',
      );
    }
    const created = await this.disbursements.initiate(dto.loanApplicationId, {
      amount: dto.amount,
      method: dto.method || 'NEFT',
      beneficiaryBankName: dto.beneficiaryBankName,
      beneficiaryAccount: dto.beneficiaryAccount,
      beneficiaryIfsc: dto.beneficiaryIfsc,
      initiatedBy: this.actorId(admin),
    });
    return {
      id: created.id,
      status: created.status,
      amount: money(created.amount),
    };
  }

  async updateDisbursementStatus(
    id: string,
    status: string,
    providerReference: string | undefined,
    admin: CurrentAdminPayload,
  ) {
    const current = await this.disbursements.findById(id);
    const updated = await this.disbursements.updateStatus(id, status, providerReference);
    if (status === 'SUCCESS') {
      await this.loans.activateAfterDisbursement(current.loanApplicationId, this.actorId(admin));
    }
    return {
      id: updated.id,
      status: updated.status,
      amount: money(updated.amount),
      providerReference: updated.providerReference,
    };
  }

  async listOverdue() {
    const rows = await this.repayments.getOverdueSchedules();
    const userIds = [...new Set(rows.map((row) => row.loanApplication.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true },
        })
      : [];
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => {
      const user = byId.get(row.loanApplication.userId);
      return {
        id: row.id,
        loanApplicationId: row.loanApplicationId,
        applicationNumber: row.loanApplication.applicationNumber,
        sequence: row.sequence,
        dueDate: row.dueDate,
        totalAmount: money(row.totalAmount),
        paidAmount: money(row.paidAmount),
        status: row.status,
        customerName: displayName(user),
        mobile: user?.phoneNumber || null,
      };
    });
  }

  async listPayments() {
    const rows = await this.prisma.payment.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        loanApplication: { select: { applicationNumber: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      applicationNumber: row.loanApplication?.applicationNumber || null,
      customerName: displayName(row.user),
      amount: money(row.amount),
      status: row.status,
      method: row.method,
      direction: row.direction,
      createdAt: row.createdAt,
      capturedAt: row.capturedAt,
    }));
  }

  private actorId(admin: CurrentAdminPayload) {
    return admin.userId || admin.id;
  }

  private buildLoanWhere(status?: string, search?: string): Prisma.LoanApplicationWhereInput {
    const where: Prisma.LoanApplicationWhereInput = {};
    const term = search?.trim();
    if (status === 'PENDING') {
      where.status = { in: [...PENDING_LOAN] };
    } else if (status && status !== 'ALL') {
      where.status = status as never;
    } else {
      where.status = { not: 'DRAFT' };
    }
    if (term) {
      where.OR = [
        { applicationNumber: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: term } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }
    return where;
  }
}

type AdminLoanApproveDtoLike = {
  approvedAmount: number;
  approvedTenure: number;
  approvedInterest: number;
  reason?: string;
};

type AdminDisburseDtoLike = {
  loanApplicationId: string;
  amount: number;
  method?: string;
  beneficiaryBankName?: string;
  beneficiaryAccount?: string;
  beneficiaryIfsc?: string;
};
