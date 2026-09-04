import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async createApplication(userId: string, data: {
    loanProductId: string;
    amountRequested: number;
    tenureMonths: number;
  }) {
    const count = await this.prisma.loanApplication.count();
    const applicationNumber = `RA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const product = await this.prisma.loanProduct.findUnique({ where: { id: data.loanProductId } });
    if (!product) throw new NotFoundException('Loan product not found');

    return this.prisma.loanApplication.create({
      data: {
        applicationNumber,
        userId,
        loanProductId: data.loanProductId,
        amountRequested: new Prisma.Decimal(String(data.amountRequested)),
        tenureMonths: data.tenureMonths,
        interestRate: product.baseInterestRate,
        processingFee: new Prisma.Decimal(product.processingFeeRate.toString()).mul(
          new Prisma.Decimal(String(data.amountRequested)),
        ),
        status: 'SUBMITTED',
        currentState: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  async findById(id: string) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        loanProduct: true,
        stateEvents: { orderBy: { createdAt: 'asc' } },
        approvals: true,
        disbursements: true,
        repaymentSchedule: { orderBy: { sequence: 'asc' } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!app) throw new NotFoundException('Loan application not found');
    return app;
  }

  async findByUser(userId: string) {
    return this.prisma.loanApplication.findMany({
      where: { userId },
      include: { loanProduct: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as never } : {};

    const [applications, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          loanProduct: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loanApplication.count({ where }),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async transitionState(id: string, toState: string, changedById: string, reason?: string) {
    const app = await this.findById(id);
    const fromState = app.currentState;

    const [updated] = await this.prisma.$transaction([
      this.prisma.loanApplication.update({
        where: { id },
        data: { status: toState as never, currentState: toState },
      }),
      this.prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: id,
          fromState,
          toState,
          changedByUserId: changedById,
          reason,
        },
      }),
    ]);

    return updated;
  }

  async approve(id: string, data: {
    approvedAmount: number;
    approvedTenure: number;
    approvedInterest: number;
    reason?: string;
    approvedById: string;
    approvedByName: string;
  }) {
    const app = await this.findById(id);

    const [approval] = await this.prisma.$transaction([
      this.prisma.loanApproval.create({
        data: {
          loanApplicationId: id,
          decision: 'APPROVED',
          approvedAmount: data.approvedAmount,
          approvedTenure: data.approvedTenure,
          approvedInterest: data.approvedInterest,
          approvedById: data.approvedById,
          approvedByName: data.approvedByName,
          reason: data.reason,
        },
      }),
      this.prisma.loanApplication.update({
        where: { id },
        data: { status: 'APPROVED', currentState: 'APPROVED' },
      }),
      this.prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: id,
          fromState: app.currentState,
          toState: 'APPROVED',
          changedByUserId: data.approvedById,
          reason: data.reason,
        },
      }),
    ]);

    return approval;
  }

  async reject(id: string, data: { reason: string; rejectedById: string }) {
    const app = await this.findById(id);

    const [approval] = await this.prisma.$transaction([
      this.prisma.loanApproval.create({
        data: {
          loanApplicationId: id,
          decision: 'REJECTED',
          reason: data.reason,
          approvedById: data.rejectedById,
        },
      }),
      this.prisma.loanApplication.update({
        where: { id },
        data: { status: 'REJECTED', currentState: 'REJECTED' },
      }),
      this.prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: id,
          fromState: app.currentState,
          toState: 'REJECTED',
          changedByUserId: data.rejectedById,
          reason: data.reason,
        },
      }),
    ]);

    return approval;
  }
}
