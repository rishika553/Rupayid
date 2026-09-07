import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { LoanProductsService } from '../loan-products/loan-products.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLoanApplicationDto, UpdateLoanApplicationDto } from './dto/loan-application.dto';
import {
  assertTransition,
  OPEN_STATES,
} from './loan-application.state';
import { summarizeSchedule } from './repayment-schedule';
import { NotificationsService } from '../notifications/notifications.service';

const STAFF_ROLES = ['ADMIN', 'UNDERWRITER'];
const CUSTOMER_PRODUCT = {
  id: true,
  name: true,
  description: true,
  minAmount: true,
  maxAmount: true,
  minTenureMonths: true,
  maxTenureMonths: true,
  baseInterestRate: true,
  processingFeeRate: true,
} as const;

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: EligibilityService,
    private readonly loanProducts: LoanProductsService,
    private readonly audit: AuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async createApplication(
    userId: string,
    data: CreateLoanApplicationDto,
    extras?: { ip?: string; idempotencyKey?: string },
  ) {
    const idempotencyKey = extras?.idempotencyKey || data.idempotencyKey;
    if (idempotencyKey) {
      const replay = await this.prisma.loanApplication.findUnique({
        where: { idempotencyKey } as never,
      });
      if (replay) {
        if (replay.userId !== userId) {
          throw new ConflictException('Unable to create application');
        }
        return this.toCustomerView(await this.loadOwned(replay.id, userId));
      }
    }

    const open = await this.prisma.loanApplication.findFirst({
      where: { userId, status: { in: OPEN_STATES as never[] } },
      orderBy: { createdAt: 'desc' },
    });
    if (open) {
      if (open.status === 'DRAFT' && open.loanProductId === data.loanProductId) {
        return this.updateApplication(open.id, userId, {
          amountRequested: data.amountRequested,
          tenureMonths: data.tenureMonths,
        });
      }
      throw new ConflictException('You already have an open loan application');
    }

    const product = await this.requireOfferedProduct(data.loanProductId);
    this.assertAmountAndTenure(product, data.amountRequested, data.tenureMonths);
    const quotes = this.quote(product, data.amountRequested, data.tenureMonths);

    const created = await this.prisma.$transaction(async (tx) => {
      const applicationNumber = await this.allocateNumber(tx);
      const app = await tx.loanApplication.create({
        data: {
          applicationNumber,
          userId,
          createdById: userId,
          loanProductId: product.id,
          amountRequested: quotes.amountRequested,
          tenureMonths: data.tenureMonths,
          interestRate: quotes.interestRate,
          processingFee: quotes.processingFee,
          status: 'DRAFT',
          currentState: 'DRAFT',
          ipAddress: extras?.ip,
          idempotencyKey: idempotencyKey || null,
          metadata: { costBreakdown: quotes.costBreakdown },
        } as never,
      });
      await tx.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: app.id,
          fromState: 'NONE',
          toState: 'DRAFT',
          changedByUserId: userId,
          reason: 'Application draft created',
        },
      });
      return app;
    });

    await this.audit.log({
      actionType: 'LOAN_STATUS_CHANGED',
      entityType: 'LoanApplication',
      entityId: created.id,
      eventCategory: 'LOAN',
      changedById: userId,
      changedForUserId: userId,
      message: 'Loan application draft created',
      ipAddress: extras?.ip,
      metadata: { status: 'DRAFT', applicationNumber: created.applicationNumber },
    });

    return this.toCustomerView(await this.loadOwned(created.id, userId));
  }

  async updateApplication(
    id: string,
    userId: string,
    data: UpdateLoanApplicationDto,
    ip?: string,
  ) {
    const app = await this.loadOwned(id, userId);
    if (data.status && data.status !== 'CANCELLED') {
      throw new BadRequestException('Customers cannot change the application to that status');
    }
    if (data.status === 'CANCELLED') {
      return this.transitionOwned(app, 'CANCELLED', userId, 'customer', 'Cancelled by customer', ip);
    }
    if (app.status !== 'DRAFT') {
      throw new BadRequestException('Only a draft application can be updated');
    }
    const product = await this.requireOfferedProduct(data.loanProductId || app.loanProductId);
    const amount = data.amountRequested ?? Number(app.amountRequested);
    const tenure = data.tenureMonths ?? app.tenureMonths;
    this.assertAmountAndTenure(product, amount, tenure);
    const quotes = this.quote(product, amount, tenure);

    await this.prisma.loanApplication.update({
      where: { id: app.id },
      data: {
        loanProductId: product.id,
        amountRequested: quotes.amountRequested,
        tenureMonths: tenure,
        interestRate: quotes.interestRate,
        processingFee: quotes.processingFee,
        metadata: {
          ...asRecord(app.metadata),
          costBreakdown: quotes.costBreakdown,
        } as never,
      },
    });

    await this.audit.log({
      actionType: 'LOAN_STATUS_CHANGED',
      entityType: 'LoanApplication',
      entityId: app.id,
      eventCategory: 'LOAN',
      changedById: userId,
      changedForUserId: userId,
      message: 'Loan application draft updated',
      ipAddress: ip,
    });

    return this.toCustomerView(await this.loadOwned(id, userId));
  }

  async submitApplication(id: string, userId: string, extras?: { ip?: string; idempotencyKey?: string }) {
    const app = await this.loadOwned(id, userId);
    const status = String(app.status);
    if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'ACTIVE'].includes(status)) {
      return this.toCustomerView(app);
    }
    if (status !== 'DRAFT' && status !== 'ELIGIBILITY_CHECK') {
      throw new BadRequestException('This application cannot be submitted');
    }

    const product = await this.requireOfferedProduct(app.loanProductId);
    this.assertAmountAndTenure(product, Number(app.amountRequested), app.tenureMonths);
    await this.assertKycReady(userId);

    const eligibility = await this.eligibility.evaluate(userId, app.loanProductId);
    await this.prisma.eligibilityEvaluation.update({
      where: { id: eligibility.reference },
      data: { loanApplicationId: app.id },
    }).catch(() => undefined);

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loan_applications WHERE id = ${id} FOR UPDATE`;
      const current = await tx.loanApplication.findUnique({ where: { id } });
      if (!current || current.userId !== userId) {
        throw new NotFoundException('Loan application not found');
      }
      const currentStatus = String(current.status);
      if (['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'ACTIVE'].includes(currentStatus)) {
        return;
      }
      if (currentStatus !== 'DRAFT' && currentStatus !== 'ELIGIBILITY_CHECK') {
        throw new BadRequestException('This application cannot be submitted');
      }

      const now = new Date();
      if (current.currentState === 'DRAFT') {
        assertTransition('DRAFT', 'ELIGIBILITY_CHECK', 'submit');
        await tx.loanApplicationStateEvent.create({
          data: {
            loanApplicationId: id,
            fromState: 'DRAFT',
            toState: 'ELIGIBILITY_CHECK',
            changedByUserId: userId,
            reason: 'Eligibility check passed',
            metadata: { eligibilityReference: eligibility.reference } as never,
          },
        });
      }
      assertTransition('ELIGIBILITY_CHECK', 'SUBMITTED', 'submit');
      await tx.loanApplication.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          currentState: 'SUBMITTED',
          submittedAt: current.submittedAt || now,
          idempotencyKey: extras?.idempotencyKey || (current as { idempotencyKey?: string }).idempotencyKey,
          metadata: {
            ...asRecord(current.metadata),
            eligibilityReference: eligibility.reference,
          },
        } as never,
      });
      await tx.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: id,
          fromState: 'ELIGIBILITY_CHECK',
          toState: 'SUBMITTED',
          changedByUserId: userId,
          reason: 'Submitted by customer',
          metadata: { eligibilityReference: eligibility.reference } as never,
        },
      });
    });

    await this.audit.log({
      actionType: 'LOAN_STATUS_CHANGED',
      entityType: 'LoanApplication',
      entityId: app.id,
      eventCategory: 'LOAN',
      changedById: userId,
      changedForUserId: userId,
      message: 'Loan application submitted',
      ipAddress: extras?.ip,
      metadata: { status: 'SUBMITTED', eligibilityReference: eligibility.reference },
    });
    await this.notifications?.publish({
      eventType: 'LOAN_SUBMITTED',
      userId,
      referenceId: app.id,
      dedupeKey: `loan-submitted:${app.id}`,
      variables: { applicationNumber: app.applicationNumber },
    });

    return this.toCustomerView(await this.loadOwned(id, userId));
  }

  async findMine(userId: string) {
    const rows = await this.prisma.loanApplication.findMany({
      where: { userId },
      include: { loanProduct: { select: CUSTOMER_PRODUCT }, stateEvents: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toCustomerView(row));
  }

  async getApplication(id: string, requesterId: string) {
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
    if (!app) {
      throw new NotFoundException('Loan application not found');
    }
    const staff = await this.isStaff(requesterId);
    if (app.userId !== requesterId && !staff) {
      throw new NotFoundException('Loan application not found');
    }
    return staff ? app : this.toCustomerView(app);
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
    return this.findMine(userId);
  }

  async listTrackedLoans(userId: string) {
    const rows = await this.prisma.loanApplication.findMany({
      where: { userId },
      include: TRACKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toTrackingView(row));
  }

  async getTrackedLoan(id: string, userId: string) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: TRACKING_INCLUDE,
    });
    if (!app || app.userId !== userId) {
      throw new NotFoundException('Loan not found');
    }
    return this.toTrackingView(app);
  }

  async getRepaymentSchedule(id: string, userId: string) {
    const app = await this.prisma.loanApplication.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        applicationNumber: true,
        repaymentSchedule: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!app || app.userId !== userId) {
      throw new NotFoundException('Loan not found');
    }
    const summary = summarizeSchedule(app.repaymentSchedule);
    return {
      loanId: app.id,
      applicationNumber: app.applicationNumber,
      nextPayment: summary.nextPayment,
      totals: summary.totals,
      installments: summary.installments,
    };
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
    return this.transitionOwned(app, toState, changedById, 'workflow', reason);
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
    assertTransition(app.currentState, 'APPROVED', 'workflow');

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

    await this.audit.log({
      actionType: 'LOAN_APPROVAL',
      entityType: 'LoanApplication',
      entityId: id,
      eventCategory: 'LOAN',
      changedById: data.approvedById,
      changedForUserId: app.userId,
      message: 'Loan application approved',
    });
    await this.notifications?.publish({
      eventType: 'LOAN_APPROVED',
      userId: app.userId,
      referenceId: id,
      dedupeKey: `loan-approved:${id}`,
      variables: {
        applicationNumber: app.applicationNumber,
        amount: new Prisma.Decimal(String(data.approvedAmount)).toFixed(2),
      },
    });

    return approval;
  }

  async reject(id: string, data: { reason: string; rejectedById: string }) {
    const app = await this.findById(id);
    assertTransition(app.currentState, 'REJECTED', 'workflow');

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

    await this.audit.log({
      actionType: 'LOAN_APPROVAL',
      entityType: 'LoanApplication',
      entityId: id,
      eventCategory: 'LOAN',
      changedById: data.rejectedById,
      changedForUserId: app.userId,
      message: 'Loan application rejected',
    });
    await this.notifications?.publish({
      eventType: 'LOAN_REJECTED',
      userId: app.userId,
      referenceId: id,
      dedupeKey: `loan-rejected:${id}`,
      variables: { applicationNumber: app.applicationNumber, reason: data.reason },
    });

    return approval;
  }

  private async transitionOwned(
    app: { id: string; userId: string; currentState: string; status: string },
    toState: string,
    actorId: string,
    actor: 'customer' | 'submit' | 'workflow',
    reason?: string,
    ip?: string,
  ) {
    try {
      assertTransition(app.currentState, toState, actor);
    } catch {
      throw new BadRequestException(`Cannot move application from ${app.currentState} to ${toState}`);
    }
    await this.recordTransition(app.id, app.currentState, toState, actorId, actor, reason, ip);
    if (actor === 'workflow') {
      const updated = await this.findById(app.id);
      if (toState === 'APPROVED' || toState === 'REJECTED') {
        await this.notifications?.publish({
          eventType: toState === 'APPROVED' ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
          userId: app.userId,
          referenceId: app.id,
          dedupeKey: `loan-${toState.toLowerCase()}:${app.id}`,
          variables: {
            applicationNumber: updated.applicationNumber,
            reason: reason || '',
          },
        });
      }
      return updated;
    }
    return this.toCustomerView(await this.loadOwned(app.id, app.userId));
  }

  private async recordTransition(
    id: string,
    fromState: string,
    toState: string,
    actorId: string,
    actor: 'customer' | 'submit' | 'workflow',
    reason?: string,
    ip?: string,
  ) {
    try {
      assertTransition(fromState, toState, actor);
    } catch {
      throw new BadRequestException(`Cannot move application from ${fromState} to ${toState}`);
    }
    await this.prisma.$transaction([
      this.prisma.loanApplication.update({
        where: { id },
        data: { status: toState as never, currentState: toState },
      }),
      this.prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: id,
          fromState,
          toState,
          changedByUserId: actorId,
          reason,
        },
      }),
    ]);
    await this.audit.log({
      actionType: 'LOAN_STATUS_CHANGED',
      entityType: 'LoanApplication',
      entityId: id,
      eventCategory: 'LOAN',
      changedById: actorId,
      message: `Loan application moved to ${toState}`,
      ipAddress: ip,
      metadata: { fromState, toState },
    });
  }

  private async loadOwned(id: string, userId: string) {
    const app = await this.prisma.loanApplication.findFirst({
      where: { id, userId },
      include: {
        loanProduct: { select: CUSTOMER_PRODUCT },
        stateEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!app) {
      throw new NotFoundException('Loan application not found');
    }
    return app;
  }

  private async requireOfferedProduct(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product || !this.loanProducts.isOfferedToCustomers(product)) {
      throw new NotFoundException('Loan product not found');
    }
    return product;
  }

  private assertAmountAndTenure(
    product: { minAmount: Prisma.Decimal; maxAmount: Prisma.Decimal; minTenureMonths: number; maxTenureMonths: number },
    amount: number,
    tenure: number,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Enter a valid loan amount');
    }
    const min = Number(product.minAmount);
    const max = Number(product.maxAmount);
    if (amount < min || amount > max) {
      throw new BadRequestException(`Amount must be between ${min} and ${max}`);
    }
    if (!Number.isInteger(tenure) || tenure < product.minTenureMonths || tenure > product.maxTenureMonths) {
      throw new BadRequestException(
        `Tenure must be between ${product.minTenureMonths} and ${product.maxTenureMonths} months`,
      );
    }
  }

  private quote(
    product: { baseInterestRate: Prisma.Decimal; processingFeeRate: Prisma.Decimal },
    amount: number,
    tenureMonths: number,
  ) {
    const amountRequested = new Prisma.Decimal(String(amount));
    const interestRate = new Prisma.Decimal(product.baseInterestRate.toString());
    const processingFee = new Prisma.Decimal(product.processingFeeRate.toString()).mul(amountRequested);
    const estimatedInterest = amountRequested.mul(interestRate).mul(new Prisma.Decimal(tenureMonths)).div(12);
    const totalPayable = amountRequested.add(estimatedInterest).add(processingFee);
    return {
      amountRequested,
      interestRate,
      processingFee,
      costBreakdown: {
        amount: amountRequested.toFixed(2),
        processingFee: processingFee.toFixed(2),
        estimatedInterest: estimatedInterest.toFixed(2),
        totalPayable: totalPayable.toFixed(2),
        interestRate: interestRate.toString(),
        tenureMonths,
      },
    };
  }

  private async assertKycReady(userId: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'kyc.required_for_loan' } });
    const required = setting?.value !== false && setting?.value !== 'false';
    if (!required) {
      return;
    }
    const kyc = await this.prisma.kycApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    if (kyc?.status !== 'APPROVED') {
      throw new BadRequestException('Complete KYC before submitting a loan application');
    }
  }

  private async allocateNumber(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    const prefix = `RA-${year}-`;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const count = await tx.loanApplication.count({
        where: { applicationNumber: { startsWith: prefix } },
      });
      const candidate = `${prefix}${String(count + 1 + attempt).padStart(6, '0')}`;
      const taken = await tx.loanApplication.findUnique({
        where: { applicationNumber: candidate },
        select: { id: true },
      });
      if (!taken) {
        return candidate;
      }
    }
    return `${prefix}${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async isStaff(userId: string) {
    const links = await this.prisma.usersOnRoles.findMany({
      where: { userId },
      include: { role: true },
    });
    return links.some((link) => STAFF_ROLES.includes(link.role.name));
  }

  private toCustomerView(app: {
    id: string;
    applicationNumber: string;
    status: string;
    currentState: string;
    amountRequested: Prisma.Decimal | string | number;
    tenureMonths: number;
    interestRate: Prisma.Decimal | string | number;
    processingFee: Prisma.Decimal | string | number;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    metadata?: unknown;
    loanProduct?: unknown;
    stateEvents?: Array<{ fromState: string; toState: string; reason: string | null; createdAt: Date }>;
  }) {
    const meta = asRecord(app.metadata);
    const product = app.loanProduct as
      | {
          id: string;
          name: string;
          description?: string | null;
          minAmount?: unknown;
          maxAmount?: unknown;
          minTenureMonths?: number;
          maxTenureMonths?: number;
        }
      | undefined;
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      currentState: app.currentState,
      amountRequested: String(app.amountRequested),
      tenureMonths: app.tenureMonths,
      interestRate: String(app.interestRate),
      processingFee: String(app.processingFee),
      costBreakdown: meta.costBreakdown || null,
      eligibilityReference: typeof meta.eligibilityReference === 'string' ? meta.eligibilityReference : null,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      loanProduct: product
        ? {
            id: product.id,
            name: product.name,
            description: product.description,
            minAmount: product.minAmount != null ? String(product.minAmount) : undefined,
            maxAmount: product.maxAmount != null ? String(product.maxAmount) : undefined,
            minTenureMonths: product.minTenureMonths,
            maxTenureMonths: product.maxTenureMonths,
          }
        : null,
      timeline: (app.stateEvents || []).map((event) => ({
        fromState: event.fromState,
        toState: event.toState,
        reason: event.reason,
        createdAt: event.createdAt,
      })),
    };
  }

  private toTrackingView(app: {
    id: string;
    userId: string;
    applicationNumber: string;
    status: string;
    currentState: string;
    amountRequested: Prisma.Decimal | string | number;
    tenureMonths: number;
    interestRate: Prisma.Decimal | string | number;
    processingFee: Prisma.Decimal | string | number;
    submittedAt: Date | null;
    createdAt: Date;
    metadata?: unknown;
    loanProduct?: { id: string; name: string; description?: string | null } | null;
    approvals?: Array<{
      decision: string;
      approvedAmount: Prisma.Decimal | string | number | null;
      approvedTenure: number | null;
      approvedAt: Date;
    }>;
    disbursements?: Array<{ status: string; successAt: Date | null; amount: Prisma.Decimal | string | number }>;
    repaymentSchedule?: Array<{
      id: string;
      sequence: number;
      dueDate: Date;
      principalPortion: Prisma.Decimal | string | number;
      interestPortion: Prisma.Decimal | string | number;
      penaltyPortion: Prisma.Decimal | string | number;
      totalAmount: Prisma.Decimal | string | number;
      paidAmount: Prisma.Decimal | string | number;
      status: string;
    }>;
    payments?: Array<{
      id: string;
      txRef: string | null;
      method: string;
      type: string;
      direction: string;
      status: string;
      amount: Prisma.Decimal | string | number;
      capturedAt: Date | null;
      createdAt: Date;
    }>;
    stateEvents?: Array<{ fromState: string; toState: string; reason: string | null; createdAt: Date }>;
  }) {
    const approval = (app.approvals || []).find((row) => row.decision === 'APPROVED') || app.approvals?.[0];
    const disbursed = (app.disbursements || []).find((row) => row.status === 'SUCCESS' && row.successAt);
    const schedule = app.repaymentSchedule || [];
    const summary = summarizeSchedule(schedule);
    const approvedAmount = approval?.approvedAmount ?? app.amountRequested;
    const tenure = approval?.approvedTenure ?? app.tenureMonths;
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      loanProduct: app.loanProduct
        ? { id: app.loanProduct.id, name: app.loanProduct.name, description: app.loanProduct.description }
        : null,
      approvedAmount: String(approvedAmount),
      requestedAmount: String(app.amountRequested),
      tenureMonths: tenure,
      interestRate: String(app.interestRate),
      processingFee: String(app.processingFee),
      applicationDate: app.submittedAt || app.createdAt,
      approvalDate: approval?.approvedAt || null,
      disbursementDate: disbursed?.successAt || null,
      outstandingAmount: summary.totals.outstanding,
      nextRepayment: summary.nextPayment
        ? {
            dueDate: summary.nextPayment.dueDate,
            amount: summary.nextPayment.outstanding,
            paidAmount: summary.nextPayment.amountPaid,
            status: summary.nextPayment.status,
          }
        : null,
      schedule: summary.installments,
      paymentHistory: (app.payments || []).map((row) => ({
        id: row.id,
        reference: row.txRef,
        method: row.method,
        type: row.type,
        direction: row.direction,
        status: row.status,
        amount: String(row.amount),
        paidAt: row.capturedAt || row.createdAt,
      })),
      costBreakdown: asRecord(app.metadata).costBreakdown || null,
      timeline: (app.stateEvents || []).map((event) => ({
        fromState: event.fromState,
        toState: event.toState,
        createdAt: event.createdAt,
      })),
    };
  }
}

const TRACKING_INCLUDE = {
  loanProduct: { select: { id: true, name: true, description: true } },
  stateEvents: {
    orderBy: { createdAt: 'asc' as const },
    select: { fromState: true, toState: true, reason: true, createdAt: true },
  },
  approvals: {
    orderBy: { approvedAt: 'desc' as const },
    select: { decision: true, approvedAmount: true, approvedTenure: true, approvedAt: true },
  },
  disbursements: {
    orderBy: { createdAt: 'desc' as const },
    select: { amount: true, status: true, successAt: true },
  },
  repaymentSchedule: { orderBy: { sequence: 'asc' as const } },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      txRef: true,
      method: true,
      type: true,
      direction: true,
      status: true,
      amount: true,
      capturedAt: true,
      createdAt: true,
    },
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

