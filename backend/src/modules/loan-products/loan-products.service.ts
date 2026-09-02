import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllIncludingInactive() {
    return this.prisma.loanProduct.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByCode(code: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { code } });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async findById(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async create(data: {
    code: string;
    name: string;
    description?: string;
    minAmount: number;
    maxAmount: number;
    minTenureMonths: number;
    maxTenureMonths: number;
    baseInterestRate: number;
    processingFeeRate: number;
    insuranceRate?: number;
    penaltyRate?: number;
  }) {
    return this.prisma.loanProduct.create({
      data: {
        ...data,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        baseInterestRate: data.baseInterestRate,
        processingFeeRate: data.processingFeeRate,
        isActive: true,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    minAmount: number;
    maxAmount: number;
    minTenureMonths: number;
    maxTenureMonths: number;
    baseInterestRate: number;
    processingFeeRate: number;
    isActive: boolean;
  }>) {
    await this.findById(id);
    return this.prisma.loanProduct.update({ where: { id }, data });
  }
}
