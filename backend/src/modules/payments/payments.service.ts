import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const txRef = `TXN-${uuid().slice(0, 12).toUpperCase()}`;

    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        loanApplicationId: data.loanApplicationId || null,
        txRef,
        method: data.method as never,
        type: data.type as never,
        direction: data.direction as never,
        status: 'INITIATED',
        amount: data.amount,
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
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async findByTxRef(txRef: string) {
    return this.prisma.payment.findUnique({
      where: { txRef },
      include: { transactions: true },
    });
  }

  async updateStatus(id: string, status: string, refusalReason?: string) {
    await this.findById(id);
    const updateData: Record<string, unknown> = { status };

    if (status === 'SUCCESS') updateData.capturedAt = new Date();
    else if (status === 'FAILED') updateData.failedAt = new Date();
    if (refusalReason) updateData.refusalReason = refusalReason;

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
        amount: data.amount,
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
    return this.prisma.payment.findMany({
      where: { userId },
      include: { transactions: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
