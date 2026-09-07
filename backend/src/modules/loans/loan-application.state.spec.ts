import { canTransition } from './loan-application.state';

describe('loan application state machine', () => {
  it('lets a customer cancel a draft only', () => {
    expect(canTransition('DRAFT', 'CANCELLED', 'customer')).toBe(true);
    expect(canTransition('DRAFT', 'APPROVED', 'customer')).toBe(false);
    expect(canTransition('SUBMITTED', 'CANCELLED', 'customer')).toBe(false);
  });

  it('blocks customers from privileged states', () => {
    for (const target of ['APPROVED', 'DISBURSED', 'ACTIVE', 'DISBURSEMENT_PENDING']) {
      expect(canTransition('UNDER_REVIEW', target, 'customer')).toBe(false);
      expect(canTransition('DRAFT', target, 'submit')).toBe(false);
    }
  });

  it('allows submit to pass through eligibility into submitted', () => {
    expect(canTransition('DRAFT', 'ELIGIBILITY_CHECK', 'submit')).toBe(true);
    expect(canTransition('ELIGIBILITY_CHECK', 'SUBMITTED', 'submit')).toBe(true);
    expect(canTransition('ELIGIBILITY_CHECK', 'APPROVED', 'submit')).toBe(false);
  });

  it('allows only workflow actors to approve and disburse', () => {
    expect(canTransition('UNDER_REVIEW', 'APPROVED', 'workflow')).toBe(true);
    expect(canTransition('APPROVED', 'DISBURSEMENT_PENDING', 'workflow')).toBe(true);
    expect(canTransition('DISBURSEMENT_PENDING', 'DISBURSED', 'workflow')).toBe(true);
    expect(canTransition('DISBURSED', 'ACTIVE', 'workflow')).toBe(true);
    expect(canTransition('ACTIVE', 'CLOSED', 'workflow')).toBe(true);
    expect(canTransition('DRAFT', 'APPROVED', 'workflow')).toBe(false);
  });
});
