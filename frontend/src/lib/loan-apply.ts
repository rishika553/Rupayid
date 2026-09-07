import { z } from 'zod';
import type { LoanApplication, LoanProduct } from '@/lib/types';

export const APPLY_STEPS = [
  { id: 1, title: 'Product', description: 'Confirm the loan product' },
  { id: 2, title: 'Amount', description: 'Choose how much you need' },
  { id: 3, title: 'Tenure', description: 'Choose repayment period' },
  { id: 4, title: 'Cost', description: 'Review fees from RupayAid' },
  { id: 5, title: 'Eligibility', description: 'Check from the eligibility engine' },
  { id: 6, title: 'Review', description: 'Confirm before you submit' },
  { id: 7, title: 'Confirm', description: 'Application received' },
] as const;

export const TRACKING_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'DECISION', label: 'Approved/Rejected' },
  { key: 'DISBURSEMENT', label: 'Disbursement' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

export function applyFormSchema(product?: LoanProduct) {
  const minAmount = product ? Number(product.minAmount) : 1;
  const maxAmount = product ? Number(product.maxAmount) : Number.MAX_SAFE_INTEGER;
  const minTenure = product?.minTenureMonths ?? 1;
  const maxTenure = product?.maxTenureMonths ?? 360;
  return z.object({
    loanProductId: z.string().min(1, 'Select a product'),
    amountRequested: z.coerce
      .number({ invalid_type_error: 'Enter an amount' })
      .positive('Enter an amount')
      .min(minAmount, `Minimum amount is ${minAmount}`)
      .max(maxAmount, `Maximum amount is ${maxAmount}`),
    tenureMonths: z.coerce
      .number({ invalid_type_error: 'Enter tenure' })
      .int('Tenure must be a whole number of months')
      .min(minTenure, `Minimum tenure is ${minTenure} months`)
      .max(maxTenure, `Maximum tenure is ${maxTenure} months`),
  });
}

export type ApplyFormValues = z.infer<ReturnType<typeof applyFormSchema>>;

export function trackingIndex(status?: string) {
  const value = (status || '').toUpperCase();
  if (['CLOSED'].includes(value)) {
    return 6;
  }
  if (['ACTIVE'].includes(value)) {
    return 5;
  }
  if (['DISBURSED', 'DISBURSEMENT_PENDING'].includes(value)) {
    return 4;
  }
  if (['APPROVED', 'REJECTED'].includes(value)) {
    return 3;
  }
  if (['UNDER_REVIEW'].includes(value)) {
    return 2;
  }
  if (['SUBMITTED', 'ELIGIBILITY_CHECK'].includes(value)) {
    return 1;
  }
  return 0;
}

export function decisionLabel(status?: string) {
  const value = (status || '').toUpperCase();
  if (value === 'REJECTED') {
    return 'Rejected';
  }
  if (value === 'APPROVED' || trackingIndex(value) > 3) {
    return 'Approved';
  }
  return 'Approved/Rejected';
}

export function indicativeMonthly(application?: LoanApplication | null) {
  const total = Number(application?.costBreakdown?.totalPayable);
  const tenure = application?.tenureMonths || Number(application?.costBreakdown?.tenureMonths);
  if (!Number.isFinite(total) || !tenure || tenure <= 0) {
    return null;
  }
  return total / tenure;
}
