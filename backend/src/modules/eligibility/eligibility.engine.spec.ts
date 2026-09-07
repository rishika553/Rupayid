import { ageInYears, customerReason, evaluateRule } from './eligibility.engine';

const facts = {
  ageYears: 30,
  monthlyIncome: 40000,
  creditScore: 720,
  city: 'Mumbai',
  pincode: '400001',
  occupation: 'salaried',
};

describe('eligibility engine', () => {
  it('passes and fails numeric rules deterministically', () => {
    expect(
      evaluateRule({ key: 'min_age', ruleType: 'AGE', operator: 'GREATER_THAN_OR_EQUAL', value: 21 }, facts).status,
    ).toBe('ELIGIBLE');
    expect(
      evaluateRule({ key: 'max_age', ruleType: 'AGE', operator: 'LESS_THAN_OR_EQUAL', value: 25 }, facts).status,
    ).toBe('INELIGIBLE');
  });

  it('treats missing facts as additional information', () => {
    const verdict = evaluateRule(
      { key: 'min_income', ruleType: 'INCOME', operator: 'GREATER_THAN_OR_EQUAL', value: 15000 },
      { ...facts, monthlyIncome: null },
    );
    expect(verdict).toEqual({ status: 'PENDING', matched: null, category: 'INCOME' });
  });

  it('matches cities without exposing case differences', () => {
    const verdict = evaluateRule(
      {
        key: 'allowed_cities',
        ruleType: 'CITY_POSTCODE',
        operator: 'IN',
        value: ['mumbai', 'Delhi'],
      },
      facts,
    );
    expect(verdict.status).toBe('ELIGIBLE');
  });

  it('computes age from date of birth', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 21);
    dob.setDate(dob.getDate() - 1);
    expect(ageInYears(dob)).toBeGreaterThanOrEqual(21);
  });

  it('returns customer-safe reasons', () => {
    expect(customerReason('NOT_ELIGIBLE', 'AGE')).not.toMatch(/21|operator|GREATER/i);
    expect(customerReason('ADDITIONAL_INFORMATION_REQUIRED', 'INCOME')).toMatch(/income/i);
  });
});
