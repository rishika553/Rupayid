import { applyFormSchema, indicativeMonthly, tenureChoices } from './loan-apply';

const product = {
  id: 'p1',
  name: 'Personal',
  minAmount: 10000,
  maxAmount: 500000,
  minTenureMonths: 6,
  maxTenureMonths: 36,
  tenureOptions: [],
} as unknown as Parameters<typeof applyFormSchema>[0];

describe('applyFormSchema', () => {
  it('rejects an amount below the product minimum', () => {
    const res = applyFormSchema(product!).safeParse({
      loanProductId: 'p1', amountRequested: 5000, tenureMonths: 12,
    });
    expect(res.success).toBe(false);
  });

  it('rejects a tenure above the product maximum', () => {
    const res = applyFormSchema(product!).safeParse({
      loanProductId: 'p1', amountRequested: 50000, tenureMonths: 48,
    });
    expect(res.success).toBe(false);
  });

  it('accepts a valid amount + tenure', () => {
    const res = applyFormSchema(product!).safeParse({
      loanProductId: 'p1', amountRequested: 50000, tenureMonths: 12,
    });
    expect(res.success).toBe(true);
  });

  it('requires a product id', () => {
    const res = applyFormSchema(product!).safeParse({
      loanProductId: '', amountRequested: 50000, tenureMonths: 12,
    });
    expect(res.success).toBe(false);
  });
});

describe('indicativeMonthly', () => {
  it('divides total payable by tenure', () => {
    expect(indicativeMonthly({
      tenureMonths: 12,
      costBreakdown: { totalPayable: '12000', tenureMonths: 12 },
    } as unknown as Parameters<typeof indicativeMonthly>[0])).toBe(1000);
  });
  it('returns null for missing data', () => {
    expect(indicativeMonthly(null)).toBeNull();
    expect(indicativeMonthly({} as unknown as Parameters<typeof indicativeMonthly>[0])).toBeNull();
  });
});

describe('tenureChoices', () => {
  it('uses tenureOptions when present', () => {
    expect(tenureChoices({ ...product!, tenureOptions: [6, 12, 24] } as unknown as Parameters<typeof tenureChoices>[0]))
      .toEqual([6, 12, 24]);
  });
  it('fills the min..max range when tenureOptions is empty', () => {
    expect(tenureChoices({ ...product!, tenureOptions: [], minTenureMonths: 6, maxTenureMonths: 9 } as unknown as Parameters<typeof tenureChoices>[0]))
      .toEqual([6, 7, 8, 9]);
  });
});
