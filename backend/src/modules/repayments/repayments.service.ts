import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedule(loanApplicationId: string) {
    const schedule = await this.prisma.repaymentSchedule.findMany({
      where: { loanApplicationId },
      orderBy: { sequence: 'asc' },
    });

    if (!schedule.length) {
      const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanApplicationId } });
      if (!loan) throw new NotFoundException('Loan application not found');
    }

    return schedule;
  }

  async createRepayment(data: {
    loanApplicationId: string;
    scheduleId?: string;
    paymentId?: string;
    amount: number;
    principalAllocated?: number;
    interestAllocated?: number;
    penaltyAllocated?: number;
  }) {
    return this.prisma.repayment.create({
      data: {
        loanApplicationId: data.loanApplicationId,
        scheduleId: data.scheduleId || null,
        paymentId: data.paymentId || null,
        amount: data.amount,
        principalAllocated: data.principalAllocated || 0,
        interestAllocated: data.interestAllocated || 0,
        penaltyAllocated: data.penaltyAllocated || 0,
        status: 'SCHEDULED',
      },
    });
  }

  async findByLoan(loanApplicationId: string) {
    return this.prisma.repayment.findMany({
      where: { loanApplicationId },
      include: { schedule: true, payment: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOverdueSchedules() {
    const now = new Date();
    return this.prisma.repaymentSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PAST_DUE'] },
        dueDate: { lt: now },
      },
      include: {
        loanApplication: {
          select: { id: true, applicationNumber: true, userId: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateScheduleStatus(id: string, status: string, paidAmount?: number) {
    const schedule = await this.prisma.repaymentSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Repayment schedule not found');

    return this.prisma.repaymentSchedule.update({
      where: { id },
      data: {
        status: status as never,
        paidAmount: paidAmount !== undefined ? paidAmount : schedule.paidAmount,
      },
    });
  }
}
