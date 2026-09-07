import { NotFoundException } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';

function service(overrides?: {
  product?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  rules?: Array<Record<string, unknown>>;
}) {
  const product = overrides?.product === undefined
    ? {
        id: 'prod-1',
        isActive: true,
        name: 'Personal Loan',
        description: null,
        minAmount: '50000',
        maxAmount: '200000',
        minTenureMonths: 6,
        maxTenureMonths: 12,
        baseInterestRate: '0.12',
        processingFeeRate: '0.01',
        insuranceRate: null,
        penaltyRate: null,
        rules: {},
      }
    : overrides.product;
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    loanProduct: {
      findUnique: jest.fn(async () => product),
    },
    user: {
      findUnique: jest.fn(async () =>
        overrides?.user === undefined
          ? {
              id: 'user-1',
              profile: {
                dateOfBirth: new Date('1990-01-15'),
                yearlyIncome: 600000,
                creditScore: 710,
                city: 'Mumbai',
                pincode: '400001',
                occupation: 'salaried',
              },
              kycApplications: [],
            }
          : overrides.user,
      ),
    },
    eligibilityRule: {
      findMany: jest.fn(async () => overrides?.rules ?? [
        {
          id: 'rule-age',
          key: 'min_age',
          ruleType: 'AGE',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 21,
          version: 1,
          appliedVersionId: 'ver-age',
          versions: [
            {
              id: 'ver-age',
              version: 1,
              status: 'ACTIVE',
              ruleJson: { key: 'min_age', ruleType: 'AGE', operator: 'GREATER_THAN_OR_EQUAL', value: 21 },
            },
          ],
        },
      ]),
    },
    $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<void>) => fn(prisma)),
    eligibilityEvaluation: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return data;
      }),
    },
  };
  const loanProducts = {
    isOfferedToCustomers: jest.fn((row: { isActive?: boolean }) => row.isActive === true),
    toCustomerProduct: jest.fn(() => ({
      id: 'prod-1',
      name: 'Personal Loan',
      description: null,
      minAmount: '50000',
      maxAmount: '200000',
      minTenureMonths: 6,
      maxTenureMonths: 12,
      tenureOptions: [6, 12],
      interest: { annualRate: '0.12' },
      fees: { processingFeeRate: '0.01' },
      eligibilityRequirements: [],
      isActive: true,
    })),
  };
  const audit = { log: jest.fn() };
  return {
    created,
    audit,
    svc: new EligibilityService(prisma as never, loanProducts as never, audit as never),
  };
}

describe('EligibilityService.evaluate', () => {
  it('returns a customer-safe eligible result and stores versioned snapshots', async () => {
    const { svc, created, audit } = service();
    const result = await svc.evaluate('user-1', 'prod-1');
    expect(result.eligible).toBe(true);
    expect(result.status).toBe('ELIGIBLE');
    expect(result.eligibleAmount).toBe('200000');
    expect(result.availableTenure).toEqual([6, 12]);
    expect(result.reference).toBeTruthy();
    expect(JSON.stringify(result)).not.toMatch(/min_age|GREATER_THAN|ruleJson|creditScore/);
    expect(created.some((row) => row.ruleVersionId === 'ver-age')).toBe(true);
    expect(created.some((row) => row.id === result.reference)).toBe(true);
    expect(audit.log).toHaveBeenCalled();
  });

  it('asks for more information when a required fact is missing', async () => {
    const { svc } = service({
      user: {
        profile: { yearlyIncome: null, city: 'Mumbai', dateOfBirth: new Date('1990-01-15'), creditScore: 710 },
        kycApplications: [],
      },
      rules: [
        {
          id: 'rule-income',
          key: 'min_income',
          ruleType: 'INCOME',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 15000,
          version: 1,
          appliedVersionId: null,
          versions: [{ id: 'ver-income', version: 1, status: 'ACTIVE', ruleJson: null }],
        },
      ],
    });
    await expect(svc.evaluate('user-1', 'prod-1')).resolves.toMatchObject({
      eligible: false,
      status: 'ADDITIONAL_INFORMATION_REQUIRED',
      category: 'INCOME',
    });
  });

  it('hides inactive products', async () => {
    const { svc } = service({ product: { id: 'prod-off', isActive: false } });
    await expect(svc.evaluate('user-1', 'prod-off')).rejects.toBeInstanceOf(NotFoundException);
  });
});
