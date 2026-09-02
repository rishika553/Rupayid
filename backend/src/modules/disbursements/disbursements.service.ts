import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisbursementsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(loanApplicationId: string, data: {
    amount: number;
    method: string;
    beneficiaryBankName?: string;
    beneficiaryAccount?: string;
    beneficiaryIfsc?: string;
    initiatedBy: string;
  }) {
    const loan = await this.prisma.loanApplication.findUnique({ where: { id: loanApplicationId } });
    if (!loan) throw new NotFoundException('Loan application not found');

    return this.prisma.loanDisbursement.create({
      data: {
        loanApplicationId,
        amount: data.amount,
        method: data.method as never,
        status: 'PENDING',
        beneficiaryBankName: data.beneficiaryBankName,
        beneficiaryAccount: data.beneficiaryAccount,
        beneficiaryIfsc: data.beneficiaryIfsc,
        initiatedBy: data.initiatedBy,
      },
    });
  }

  async findAll(loanApplicationId?: string) {
    const where = loanApplicationId ? { loanApplicationId } : {};
    return this.prisma.loanDisbursement.findMany({
      where,
      include: {
        loanApplication: {
          select: { id: true, applicationNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const disbursement = await this.prisma.loanDisbursement.findUnique({
      where: { id },
      include: {
        loanApplication: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!disbursement) throw new NotFoundException('Disbursement not found');
    return disbursement;
  }

  async updateStatus(id: string, status: string, providerReference?: string) {
    await this.findById(id);

    const updateData: Record<string, unknown> = { status };

    if (status === 'SUCCESS') {
      updateData.successAt = new Date();
      updateData.providerReference = providerReference;
    } else if (status === 'FAILED') {
      updateData.failedAt = new Date();
    } else if (status === 'PROCESSING') {
      updateData.attemptedAt = new Date();
    }

    return this.prisma.loanDisbursement.update({
      where: { id },
      data: updateData as never,
    });
  }

  async listByStatus(status: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.loanDisbursement.findMany({
        where: { status: status as never },
        include: {
          loanApplication: {
            select: { id: true, applicationNumber: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loanDisbursement.count({ where: { status: status as never } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
