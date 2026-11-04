import { z } from 'zod';
import type { LoanApplication, LoanProduct } from '@/types';

export const APPLY_STEPS = [
  { id: 1, title: 'Product' },
  { id: 2, title: 'Amount' },
  { id: 3, title: 'Tenure' },
  { id: 4, title: 'Cost' },
  { id: 5, title: 'Eligibility' },
  { id: 6, title: 'Review' },
  { id: 7, title: 'Done' },
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
      .number({ invalid_type_error: 'Select tenure' })
      .int('Tenure must be a whole number of months')
      .min(minTenure, `Minimum tenure is ${minTenure} months`)
      .max(maxTenure, `Maximum tenure is ${maxTenure} months`),
  });
}

export type ApplyFormValues = z.infer<ReturnType<typeof applyFormSchema>>;

export function indicativeMonthly(application?: LoanApplication | null) {
  const total = Number(application?.costBreakdown?.totalPayable);
  const tenure = application?.tenureMonths || Number(application?.costBreakdown?.tenureMonths);
  if (!Number.isFinite(total) || !tenure || tenure <= 0) return null;
  return total / tenure;
}

export function tenureChoices(product: LoanProduct): number[] {
  if (product.tenureOptions && product.tenureOptions.length > 0) return product.tenureOptions;
  const span = product.maxTenureMonths - product.minTenureMonths + 1;
  return Array.from({ length: span }, (_, idx) => product.minTenureMonths + idx);
}
