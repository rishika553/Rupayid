export const LOAN_APPLICATION_STATES = [
  'DRAFT',
  'SUBMITTED',
  'ELIGIBILITY_CHECK',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISBURSEMENT_PENDING',
  'DISBURSED',
  'ACTIVE',
  'CLOSED',
  'CANCELLED',
] as const;

export type LoanApplicationState = (typeof LOAN_APPLICATION_STATES)[number];

export const TERMINAL_STATES: LoanApplicationState[] = ['REJECTED', 'CLOSED', 'CANCELLED'];

export const OPEN_STATES: LoanApplicationState[] = [
  'DRAFT',
  'ELIGIBILITY_CHECK',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'DISBURSEMENT_PENDING',
  'DISBURSED',
  'ACTIVE',
];

export const CUSTOMER_FORBIDDEN_TARGETS: LoanApplicationState[] = [
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'DISBURSEMENT_PENDING',
];

const CUSTOMER_TRANSITIONS: Record<string, LoanApplicationState[]> = {
  DRAFT: ['CANCELLED'],
};

const SUBMIT_TRANSITIONS: Record<string, LoanApplicationState[]> = {
  DRAFT: ['ELIGIBILITY_CHECK'],
  ELIGIBILITY_CHECK: ['SUBMITTED', 'DRAFT'],
};

const WORKFLOW_TRANSITIONS: Record<string, LoanApplicationState[]> = {
  DRAFT: ['ELIGIBILITY_CHECK', 'CANCELLED'],
  ELIGIBILITY_CHECK: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED', 'DRAFT'],
  SUBMITTED: ['ELIGIBILITY_CHECK', 'UNDER_REVIEW', 'CANCELLED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['DISBURSEMENT_PENDING', 'REJECTED'],
  DISBURSEMENT_PENDING: ['DISBURSED', 'CANCELLED'],
  DISBURSED: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
};

export type TransitionActor = 'customer' | 'submit' | 'workflow';

export function canTransition(
  from: string,
  to: string,
  actor: TransitionActor,
): boolean {
  if (actor === 'customer' && CUSTOMER_FORBIDDEN_TARGETS.includes(to as LoanApplicationState)) {
    return false;
  }
  const table =
    actor === 'customer' ? CUSTOMER_TRANSITIONS : actor === 'submit' ? SUBMIT_TRANSITIONS : WORKFLOW_TRANSITIONS;
  return (table[from] || []).includes(to as LoanApplicationState);
}

export function assertTransition(from: string, to: string, actor: TransitionActor) {
  if (!canTransition(from, to, actor)) {
    throw new Error(`Cannot move application from ${from} to ${to}`);
  }
}

export function isOpenState(state: string) {
  return OPEN_STATES.includes(state as LoanApplicationState);
}

export function isTerminalState(state: string) {
  return TERMINAL_STATES.includes(state as LoanApplicationState);
}
