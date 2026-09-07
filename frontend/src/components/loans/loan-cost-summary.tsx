import { formatFeeRate, formatInr, formatPercent, productInterestRate, productProcessingFeeRate } from '@/lib/format';
import { indicativeMonthly } from '@/lib/loan-apply';
import type { LoanApplication, LoanProduct } from '@/lib/types';

export function LoanCostSummary({
  product,
  application,
  amount,
  tenureMonths,
}: {
  product?: LoanProduct | null;
  application?: LoanApplication | null;
  amount?: number;
  tenureMonths?: number;
}) {
  const breakdown = application?.costBreakdown;
  const monthly = indicativeMonthly(application);
  const rate = application?.interestRate ?? (product ? productInterestRate(product) : null);
  const fee = breakdown?.processingFee ?? application?.processingFee;

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Loan amount</dt>
        <dd className="mt-1 font-medium">{formatInr(breakdown?.amount ?? application?.amountRequested ?? amount)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tenure</dt>
        <dd className="mt-1 font-medium">{breakdown?.tenureMonths ?? application?.tenureMonths ?? tenureMonths} months</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Interest</dt>
        <dd className="mt-1 font-medium">{rate != null ? formatPercent(rate) : '—'}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Fees</dt>
        <dd className="mt-1 font-medium">
          {fee != null ? formatInr(fee) : product ? `${formatFeeRate(productProcessingFeeRate(product))} processing` : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estimated interest</dt>
        <dd className="mt-1 font-medium">{breakdown?.estimatedInterest ? formatInr(breakdown.estimatedInterest) : 'Saved after RupayAid quotes this draft'}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Total payable</dt>
        <dd className="mt-1 font-medium">{breakdown?.totalPayable ? formatInr(breakdown.totalPayable) : '—'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estimated repayment</dt>
        <dd className="mt-1 font-medium">
          {monthly != null ? `${formatInr(monthly)} / month` : 'Available after the server cost breakdown'}
        </dd>
        <p className="mt-1 text-xs text-muted-foreground">
          Amounts, fees, and totals come from the loan service. Monthly repayment is shown only as a guide.
        </p>
      </div>
    </dl>
  );
}
