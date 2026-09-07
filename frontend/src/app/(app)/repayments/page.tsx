'use client';

import { useState } from 'react';
import { RepaymentSchedulePanel } from '@/components/loans/repayment-schedule-panel';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoanRepaymentSchedule, useMyTrackedLoans } from '@/hooks/use-customer-data';

export default function RepaymentsPage() {
  const loansQuery = useMyTrackedLoans();
  const loans = loansQuery.data || [];
  const [loanId, setLoanId] = useState<string>('');
  const selectedId = loanId || loans[0]?.id;
  const scheduleQuery = useLoanRepaymentSchedule(selectedId);

  if (loansQuery.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (loansQuery.error) {
    return <ErrorState message="Unable to load loans." onRetry={() => void loansQuery.refetch()} />;
  }
  if (loans.length === 0) {
    return (
      <EmptyState
        title="No repayment schedule"
        description="Apply for a loan first. EMIs appear after disbursement."
        actionHref="/loans/apply"
        actionLabel="Apply"
      />
    );
  }

  return (
    <div>
      <PageHeader title="Repayments" description="Next payment, amounts due, and the full EMI schedule." />
      <div className="mb-4">
        <label htmlFor="loan" className="mb-2 block text-sm font-medium">
          Loan
        </label>
        <select
          id="loan"
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          value={selectedId}
          onChange={(event) => setLoanId(event.target.value)}
        >
          {loans.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.applicationNumber}
            </option>
          ))}
        </select>
      </div>
      {scheduleQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : scheduleQuery.error || !scheduleQuery.data ? (
        <ErrorState message="Unable to load this repayment schedule." onRetry={() => void scheduleQuery.refetch()} />
      ) : (
        <RepaymentSchedulePanel schedule={scheduleQuery.data} />
      )}
    </div>
  );
}
