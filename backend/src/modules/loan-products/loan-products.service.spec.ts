import { NotFoundException } from '@nestjs/common';
import { LoanProductsService } from './loan-products.service';

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    code: 'PL-1L-12M',
    name: 'Personal Loan',
    description: 'Salaried personal loan',
    minAmount: { toString: () => '50000' },
    maxAmount: { toString: () => '200000' },
    minTenureMonths: 6,
    maxTenureMonths: 12,
    baseInterestRate: { toString: () => '0.12' },
    processingFeeRate: { toString: () => '0.01' },
    insuranceRate: null,
    penaltyRate: { toString: () => '0.02' },
    isActive: true,
    rules: { minCreditScore: 650, maxDebtRatio: 0.4, customerAvailable: true },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function service(rows: ReturnType<typeof product>[]) {
  const prisma = {
    loanProduct: {
      findMany: jest.fn(async ({ where }: { where?: { isActive?: boolean } }) =>
        rows.filter((row) => (where?.isActive == null ? true : row.isActive === where.isActive)),
      ),
      findUnique: jest.fn(async ({ where }: { where: { id?: string; code?: string } }) =>
        rows.find((row) => row.id === where.id || row.code === where.code) || null,
      ),
    },
  };
  return new LoanProductsService(prisma as never);
}

describe('LoanProductsService', () => {
  it('lists only active customer-available products without admin fields', async () => {
    const svc = service([
      product(),
      product({ id: 'prod-off', isActive: false }),
      product({ id: 'prod-internal', rules: { customerAvailable: false } }),
      product({ id: 'prod-admin', rules: { adminOnly: true } }),
    ]);

    const listed = await svc.findAll();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: 'prod-1',
      name: 'Personal Loan',
      minAmount: '50000',
      maxAmount: '200000',
      isActive: true,
    });
    expect(listed[0].interest.annualRate).toBe('0.12');
    expect(listed[0].fees.processingFeeRate).toBe('0.01');
    expect(listed[0].fees.latePaymentRate).toBe('0.02');
    expect(listed[0].eligibilityRequirements).toEqual(['Minimum credit score 650']);
    expect(listed[0]).not.toHaveProperty('rules');
    expect(listed[0]).not.toHaveProperty('code');
    expect(listed[0]).not.toHaveProperty('createdAt');
  });

  it('returns 404 for inactive or internal products', async () => {
    const svc = service([product({ id: 'hidden', isActive: false })]);
    await expect(svc.findCustomerById('hidden')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findCustomerById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds stepped tenure options for longer products', () => {
    const svc = service([]);
    const view = svc.toCustomerProduct(
      product({
        minTenureMonths: 12,
        maxTenureMonths: 36,
        rules: {},
      }) as never,
    );
    expect(view.tenureOptions).toEqual([12, 18, 24, 30, 36]);
  });
});
