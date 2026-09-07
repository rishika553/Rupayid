import { Injectable, NotFoundException } from '@nestjs/common';
import type { LoanProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CustomerLoanProduct = {
  id: string;
  name: string;
  description: string | null;
  minAmount: string;
  maxAmount: string;
  minTenureMonths: number;
  maxTenureMonths: number;
  tenureOptions: number[];
  interest: {
    annualRate: string;
  };
  fees: {
    processingFeeRate: string;
    insuranceRate?: string;
    latePaymentRate?: string;
  };
  eligibilityRequirements: string[];
  isActive: boolean;
};

@Injectable()
export class LoanProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.filter((product) => this.isOfferedToCustomers(product)).map((product) => this.toCustomerProduct(product));
  }

  async findAllIncludingInactive() {
    return this.prisma.loanProduct.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByCode(code: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { code } });
    if (!product || !this.isOfferedToCustomers(product)) {
      throw new NotFoundException('Loan product not found');
    }
    return this.toCustomerProduct(product);
  }

  async findById(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async findCustomerById(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product || !this.isOfferedToCustomers(product)) {
      throw new NotFoundException('Loan product not found');
    }
    return this.toCustomerProduct(product);
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

  isOfferedToCustomers(product: LoanProduct): boolean {
    if (!product.isActive) {
      return false;
    }
    const rules = parseRules(product.rules);
    if (rules.customerAvailable === false) {
      return false;
    }
    if (rules.internalOnly === true || rules.adminOnly === true) {
      return false;
    }
    return true;
  }

  toCustomerProduct(product: LoanProduct): CustomerLoanProduct {
    const rules = parseRules(product.rules);
    const fees: CustomerLoanProduct['fees'] = {
      processingFeeRate: asDecimal(product.processingFeeRate),
    };
    if (product.insuranceRate != null) {
      fees.insuranceRate = asDecimal(product.insuranceRate);
    }
    if (product.penaltyRate != null) {
      fees.latePaymentRate = asDecimal(product.penaltyRate);
    }
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      minAmount: asDecimal(product.minAmount),
      maxAmount: asDecimal(product.maxAmount),
      minTenureMonths: product.minTenureMonths,
      maxTenureMonths: product.maxTenureMonths,
      tenureOptions: tenureOptions(product.minTenureMonths, product.maxTenureMonths, rules),
      interest: {
        annualRate: asDecimal(product.baseInterestRate),
      },
      fees,
      eligibilityRequirements: eligibilityRequirements(rules),
      isActive: product.isActive,
    };
  }
}

function asDecimal(value: unknown): string {
  if (value == null) {
    return '0';
  }
  return String(value);
}

function parseRules(rules: unknown): Record<string, unknown> {
  if (!rules) {
    return {};
  }
  if (typeof rules === 'string') {
    try {
      const parsed = JSON.parse(rules) as unknown;
      return parseRules(parsed);
    } catch {
      return {};
    }
  }
  if (typeof rules === 'object' && !Array.isArray(rules)) {
    return rules as Record<string, unknown>;
  }
  return {};
}

function tenureOptions(min: number, max: number, rules: Record<string, unknown>): number[] {
  const configured = rules.tenureOptions;
  if (Array.isArray(configured)) {
    return [...new Set(configured.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= min && value <= max))].sort(
      (a, b) => a - b,
    );
  }
  const span = max - min;
  const step =
    typeof rules.tenureStepMonths === 'number' && rules.tenureStepMonths > 0
      ? Math.floor(rules.tenureStepMonths)
      : span > 12
        ? 6
        : 1;
  const options: number[] = [];
  for (let months = min; months <= max; months += step) {
    options.push(months);
  }
  if (options[options.length - 1] !== max) {
    options.push(max);
  }
  return options;
}

function eligibilityRequirements(rules: Record<string, unknown>): string[] {
  const explicit = rules.eligibilityRequirements;
  if (Array.isArray(explicit)) {
    return explicit.map((item) => String(item).trim()).filter(Boolean);
  }
  const lines: string[] = [];
  if (typeof rules.minAge === 'number') {
    lines.push(`Minimum age ${rules.minAge}`);
  }
  if (typeof rules.maxAge === 'number') {
    lines.push(`Maximum age ${rules.maxAge}`);
  }
  if (typeof rules.minIncome === 'number') {
    lines.push(`Minimum monthly income ₹${Number(rules.minIncome).toLocaleString('en-IN')}`);
  }
  if (typeof rules.minCreditScore === 'number') {
    lines.push(`Minimum credit score ${rules.minCreditScore}`);
  }
  if (typeof rules.employment === 'string' && rules.employment.trim()) {
    lines.push(`Employment: ${rules.employment.trim()}`);
  }
  if (Array.isArray(rules.allowedCities) && rules.allowedCities.length > 0) {
    lines.push(`Available in ${rules.allowedCities.map(String).join(', ')}`);
  }
  if (Array.isArray(rules.excludedCities) && rules.excludedCities.length > 0) {
    lines.push(`Not available in ${rules.excludedCities.map(String).join(', ')}`);
  }
  return lines;
}
