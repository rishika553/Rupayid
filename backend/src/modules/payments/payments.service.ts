import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { allocateRepayment, installmentOutstanding, money } from './repayment-allocation';
import { PAYMENT_PROVIDER, type PaymentProvider } from './providers/payment-provider';

const OPEN_PAYMENT = ['INITIATED', 'PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION'];
const BLOCKED_LOAN = ['DRAFT', 'CANCELLED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async createCustomerPayment(
    userId: string,
    data: { loanId: string; installmentNumber: number; idempotencyKey?: string },
  ) {
    if (data.idempotencyKey) {
      const replay = await this.prisma.payment.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (replay) {
        if (replay.userId !== userId) {
          throw new ConflictException('Payment request could not be completed');
        }
        return this.toCustomerView(replay, { includeCheckout: true });
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loanApplication.findUnique({
        where: { id: data.loanId },
        select: { id: true, userId: true, status: true, applicationNumber: true },
      });
      if (!loan || loan.userId !== userId) {
        throw new NotFoundException('Loan not found');
      }
      if (BLOCKED_LOAN.includes(loan.status)) {
        throw new BadRequestException('This loan cannot accept repayments');
      }

      const schedule = await tx.repaymentSchedule.findUnique({
        where: { loanApplicationId_sequence: { loanApplicationId: loan.id, sequence: data.installmentNumber } },
      });
      if (!schedule) {
        throw new NotFoundException('Installment not found');
      }
      await tx.$queryRaw`SELECT id FROM repayment_schedules WHERE id = ${schedule.id} FOR UPDATE`;

      const outstanding = installmentOutstanding(schedule.totalAmount, schedule.paidAmount);
      if (outstanding.lte(0) || ['PAID', 'WAIVED', 'CANCELLED', 'WRITTEN_OFF'].includes(schedule.status)) {
        throw new BadRequestException('This installment is not payable');
      }

      const open = await tx.payment.findFirst({
        where: { scheduleId: schedule.id, status: { in: OPEN_PAYMENT as never } } as never,
        orderBy: { createdAt: 'desc' },
      });
      if (open) {
        return open;
      }

      const txRef = `TXN-${randomBytes(6).toString('hex').toUpperCase()}`;
      return tx.payment.create({
        data: {
          userId,
          loanApplicationId: loan.id,
          scheduleId: schedule.id,
          txRef,
          idempotencyKey: data.idempotencyKey || null,
          method: 'UPI',
          type: 'EMI_REPAYMENT',
          direction: 'CREDIT',
          status: 'INITIATED',
          amount: outstanding,
          currency: 'INR',
          gateway: this.provider.name,
          initiatedById: userId,
          metadata: {
            installmentNumber: schedule.sequence,
            applicationNumber: loan.applicationNumber,
          },
        } as never,
      });
    });

    if (created.gatewayRef && OPEN_PAYMENT.includes(created.status)) {
      return this.toCustomerView(created, { includeCheckout: true });
    }

    try {
      const order = await this.provider.createOrder({
        amount: money(created.amount),
        currency: created.currency,
        reference: created.txRef || created.id,
        notes: {
          paymentId: created.id,
          loanId: created.loanApplicationId || '',
          installmentNumber: String(data.installmentNumber),
        },
      });
      const pending = await this.prisma.payment.update({
        where: { id: created.id },
        data: {
          status: 'PENDING',
          gateway: order.provider,
          gatewayRef: order.orderId,
          metadata: {
            ...asRecord(created.metadata),
            installmentNumber: data.installmentNumber,
            providerOrderId: order.orderId,
            amountMinor: order.amountMinor,
            keyId: order.keyId,
          } as never,
        },
      });
      await this.audit.log({
        actionType: 'PAYMENT',
        entityType: 'Payment',
        entityId: pending.id,
        changedById: userId,
        changedForUserId: userId,
        message: 'Customer repayment initiated',
        metadata: { installmentNumber: data.installmentNumber, amount: String(pending.amount) },
      });
      return this.toCustomerView(pending, { includeCheckout: true, order });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: created.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          refusalReason: error instanceof Error ? error.message : 'Provider error',
        },
      });
      await this.audit.log({
        actionType: 'PAYMENT_FAILED',
        entityType: 'Payment',
        entityId: created.id,
        changedById: userId,
        changedForUserId: userId,
        severity: 'HIGH',
        message: 'Payment order could not be created',
      });
      await this.notifications.publish({
        eventType: 'PAYMENT_FAILED',
        userId,
        referenceId: created.id,
        dedupeKey: `payment-failed:${created.id}:create`,
        variables: { amount: money(created.amount).toFixed(2) },
      });
      throw error;
    }
  }

  async getCustomerPayment(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    return this.toCustomerView(payment, { includeCheckout: OPEN_PAYMENT.includes(payment.status) });
  }

  async listMine(userId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toCustomerView(row));
  }

  async handleProviderWebhook(rawBody: Buffer | string, signature: string | undefined) {
    const event = this.provider.verifyWebhook(rawBody, signature);
    if (!event.eventId) {
      throw new BadRequestException('Webhook event id is missing');
    }
    if (event.status === 'IGNORED') {
      return { received: true, ignored: true };
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        await webhookEvents(tx).create({
          data: {
            provider: this.provider.name,
            eventId: event.eventId,
            eventType: event.eventType,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return { received: true, duplicate: true };
        }
        throw error;
      }

      const payment = event.orderId
        ? await tx.payment.findFirst({ where: { gatewayRef: event.orderId } })
        : null;
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${payment.id} FOR UPDATE`;
      await webhookEvents(tx).updateMany({
        where: { provider: this.provider.name, eventId: event.eventId },
        data: { paymentId: payment.id },
      });

      if (payment.status === 'SUCCESS') {
        return { received: true, duplicate: true, paymentId: payment.id };
      }

      if (event.status === 'FAILED') {
        if (OPEN_PAYMENT.includes(payment.status)) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              refusalReason: event.failureReason || 'Payment failed',
              externalId: event.providerPaymentId || payment.externalId,
            },
          });
        }
        return { received: true, paymentId: payment.id, status: 'FAILED' };
      }

      const expectedMinor = money(payment.amount).mul(100);
      if (!event.amountMinor || !expectedMinor.eq(event.amountMinor)) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'DISPUTED', refusalReason: 'Provider amount did not match' },
        });
        throw new BadRequestException('Payment amount mismatch');
      }

      await this.settleSuccessfulPayment(tx, payment, event.providerPaymentId);
      return { received: true, paymentId: payment.id, status: 'SUCCESS' };
    }).then(async (result) => {
      if (result.status === 'SUCCESS' && result.paymentId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: result.paymentId } });
        if (payment?.userId) {
          await this.notifications.publish({
            eventType: 'REPAYMENT_SUCCESSFUL',
            userId: payment.userId,
            referenceId: payment.id,
            dedupeKey: `repayment-successful:${payment.id}`,
            variables: { amount: money(payment.amount).toFixed(2) },
          });
          await this.audit.log({
            actionType: 'PAYMENT',
            entityType: 'Payment',
            entityId: payment.id,
            changedForUserId: payment.userId,
            message: 'Repayment settled from provider webhook',
            metadata: { amount: String(payment.amount), gateway: payment.gateway },
          });
        }
      }
      if (result.status === 'FAILED' && result.paymentId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: result.paymentId } });
        await this.audit.log({
          actionType: 'PAYMENT_FAILED',
          entityType: 'Payment',
          entityId: result.paymentId,
          severity: 'MEDIUM',
          message: 'Provider reported payment failure',
        });
        if (payment?.userId) {
          await this.notifications.publish({
            eventType: 'PAYMENT_FAILED',
            userId: payment.userId,
            referenceId: payment.id,
            dedupeKey: `payment-failed:${payment.id}:webhook`,
            variables: { amount: money(payment.amount).toFixed(2) },
          });
        }
      }
      return result;
    });
  }

  async create(data: {
    userId?: string;
    loanApplicationId?: string;
    method: string;
    type: string;
    direction: string;
    amount: number;
    gateway?: string;
    initiatedById?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        loanApplicationId: data.loanApplicationId || null,
        txRef: `TXN-${randomBytes(6).toString('hex').toUpperCase()}`,
        method: data.method as never,
        type: data.type as never,
        direction: data.direction as never,
        status: 'INITIATED',
        amount: new Prisma.Decimal(String(data.amount)),
        gateway: data.gateway,
        initiatedById: data.initiatedById,
        metadata: (data.metadata || undefined) as never,
      },
    });
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        transactions: true,
        loanApplication: { select: { id: true, applicationNumber: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findByTxRef(txRef: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { txRef } });
    if (!payment || (userId && payment.userId !== userId)) {
      throw new NotFoundException('Payment not found');
    }
    return this.toCustomerView(payment);
  }

  async updateStatus(id: string, status: string, refusalReason?: string) {
    await this.findById(id);
    const updateData: Record<string, unknown> = { status };
    if (status === 'SUCCESS') {
      updateData.capturedAt = new Date();
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
    }
    if (refusalReason) {
      updateData.refusalReason = refusalReason;
    }
    return this.prisma.payment.update({ where: { id }, data: updateData as never });
  }

  async addTransaction(paymentId: string, data: {
    type: string;
    amount: number;
    direction: string;
    currency?: string;
  }) {
    return this.prisma.paymentTransaction.create({
      data: {
        paymentId,
        type: data.type as never,
        amount: new Prisma.Decimal(String(data.amount)),
        direction: data.direction as never,
        currency: data.currency || 'INR',
      },
    });
  }

  async listByStatus(status: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: status as never },
        include: { user: { select: { id: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { status: status as never } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listByUser(userId: string) {
    return this.listMine(userId);
  }

  private async settleSuccessfulPayment(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      amount: Prisma.Decimal;
      scheduleId?: string | null;
      loanApplicationId: string | null;
      userId: string | null;
      status: string;
    },
    providerPaymentId?: string,
  ) {
    if (!payment.scheduleId) {
      throw new BadRequestException('Payment is not linked to an installment');
    }
    await tx.$queryRaw`SELECT id FROM repayment_schedules WHERE id = ${payment.scheduleId} FOR UPDATE`;
    const schedule = await tx.repaymentSchedule.findUnique({ where: { id: payment.scheduleId } });
    if (!schedule) {
      throw new NotFoundException('Installment not found');
    }

    const allocation = allocateRepayment({
      totalAmount: schedule.totalAmount,
      paidAmount: schedule.paidAmount,
      principalPortion: schedule.principalPortion,
      interestPortion: schedule.interestPortion,
      penaltyPortion: schedule.penaltyPortion,
      paymentAmount: payment.amount,
    });
    if (allocation.applied.lte(0)) {
      throw new BadRequestException('Installment is no longer payable');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        capturedAt: new Date(),
        settledAt: new Date(),
        externalId: providerPaymentId || undefined,
      },
    });

    await tx.repaymentSchedule.update({
      where: { id: schedule.id },
      data: {
        paidAmount: allocation.newPaidAmount,
        paidAt: allocation.scheduleStatus === 'PAID' ? new Date() : schedule.paidAt,
        status: allocation.scheduleStatus as never,
      },
    });

    await tx.repayment.create({
      data: {
        loanApplicationId: schedule.loanApplicationId,
        scheduleId: schedule.id,
        paymentId: payment.id,
        amount: allocation.applied,
        principalAllocated: allocation.principal,
        interestAllocated: allocation.interest,
        penaltyAllocated: allocation.penalty,
        status: allocation.repaymentStatus as never,
        allocatedAt: new Date(),
      },
    });

    const lines = [
      { type: 'PRINCIPAL', amount: allocation.principal },
      { type: 'INTEREST', amount: allocation.interest },
      { type: 'PENALTY', amount: allocation.penalty },
    ].filter((line) => line.amount.gt(0));
    for (const line of lines) {
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: line.type as never,
          amount: line.amount,
          direction: 'CREDIT',
          currency: 'INR',
        },
      });
    }

    await this.postLedger(tx, {
      paymentId: payment.id,
      userId: payment.userId,
      amount: allocation.applied,
    });
  }

  private async postLedger(
    tx: Prisma.TransactionClient,
    input: { paymentId: string; userId: string | null; amount: Prisma.Decimal },
  ) {
    const cash = await tx.ledger.findUnique({ where: { code: 'GL-003' } });
    const receivable = await tx.ledger.findUnique({ where: { code: 'GL-001' } });
    if (!cash || !receivable) {
      throw new BadRequestException('Ledger accounts are not configured');
    }
    await this.appendLedgerEntry(tx, {
      ledgerId: cash.id,
      userId: input.userId,
      paymentId: input.paymentId,
      entryType: 'CREDIT',
      amount: input.amount,
      category: 'SETTLEMENT',
      description: 'Repayment received',
      direction: 'INFLOW',
    });
    await this.appendLedgerEntry(tx, {
      ledgerId: receivable.id,
      userId: input.userId,
      paymentId: input.paymentId,
      entryType: 'CREDIT',
      amount: input.amount,
      category: 'LOAN_REPAYMENT',
      description: 'Loan receivable reduced',
      direction: 'INFLOW',
    });
  }

  private async appendLedgerEntry(
    tx: Prisma.TransactionClient,
    data: {
      ledgerId: string;
      userId: string | null;
      paymentId: string;
      entryType: 'CREDIT' | 'DEBIT';
      amount: Prisma.Decimal;
      category: string;
      description: string;
      direction: string;
    },
  ) {
    const lastEntry = await tx.ledgerEntry.findFirst({
      where: { ledgerId: data.ledgerId },
      orderBy: { txnSeq: 'desc' },
    });
    const prevHash = lastEntry?.entryHash || null;
    const txnSeq = (lastEntry?.txnSeq ? Number(lastEntry.txnSeq) : 0) + 1;
    const payload = JSON.stringify({
      ledgerId: data.ledgerId,
      entryType: data.entryType,
      amount: data.amount.toFixed(2),
      category: data.category,
      txnSeq,
      prevHash,
      paymentId: data.paymentId,
    });
    const entryHash = createHash('sha256').update(payload).digest('hex');
    await tx.ledgerEntry.create({
      data: {
        ledgerId: data.ledgerId,
        userId: data.userId,
        paymentId: data.paymentId,
        entryType: data.entryType,
        amount: data.amount,
        category: data.category as never,
        description: data.description,
        reference: data.paymentId,
        entrySource: 'WEBHOOK',
        direction: data.direction as never,
        prevEntryHash: prevHash,
        entryHash,
      },
    });
    const change = data.entryType === 'CREDIT' ? data.amount : data.amount.negated();
    await tx.ledger.update({
      where: { id: data.ledgerId },
      data: { currentBalance: { increment: change } },
    });
  }

  private toCustomerView(
    payment: {
      id: string;
      txRef: string | null;
      loanApplicationId: string | null;
      scheduleId: string | null;
      amount: Prisma.Decimal | string | number;
      currency: string;
      status: string;
      method: string;
      type: string;
      createdAt: Date;
      capturedAt: Date | null;
      metadata?: unknown;
      gatewayRef?: string | null;
    },
    options?: {
      includeCheckout?: boolean;
      order?: { orderId: string; keyId: string; amountMinor: string; currency: string; provider: string };
    },
  ) {
    const meta = asRecord(payment.metadata);
    const keyId = options?.order?.keyId || (typeof meta.keyId === 'string' ? meta.keyId : undefined);
    const orderId = options?.order?.orderId || payment.gatewayRef || undefined;
    return {
      id: payment.id,
      txRef: payment.txRef,
      loanId: payment.loanApplicationId,
      installmentNumber: typeof meta.installmentNumber === 'number' ? meta.installmentNumber : Number(meta.installmentNumber || 0) || null,
      amount: money(payment.amount).toFixed(2),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      type: payment.type,
      createdAt: payment.createdAt,
      capturedAt: payment.capturedAt,
      checkout: options?.includeCheckout && keyId && orderId && OPEN_PAYMENT.includes(payment.status)
        ? {
            provider: options.order?.provider || 'razorpay',
            orderId,
            keyId,
            amountMinor: options.order?.amountMinor || String(meta.amountMinor || ''),
            currency: payment.currency,
          }
        : null,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function webhookEvents(client: object) {
  return (client as {
    paymentWebhookEvent: {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
    };
  }).paymentWebhookEvent;
}
