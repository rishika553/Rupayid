'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyLoans, useSchedule } from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';

export default function RepaymentsPage() {
  const loansQuery = useMyLoans();
  const loans = loansQuery.data || [];
  const [loanId, setLoanId] = useState<string>('');
  const selectedId = loanId || loans[0]?.id;
  const scheduleQuery = useSchedule(selectedId);

  const outstanding = useMemo(
    () =>
      (scheduleQuery.data || [])
        .filter((row) => !['PAID', 'WAIVED', 'CANCELLED'].includes(row.status))
        .reduce((sum, row) => sum + Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)), 0),
    [scheduleQuery.data],
  );

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
      <PageHeader title="Repayments" description="EMI lines for the selected loan." />
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
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Outstanding {formatInr(outstanding)}</CardTitle>
        </CardHeader>
      </Card>
      {scheduleQuery.isLoading ? (
        <Skeleton className="h-40" />
      ) : (scheduleQuery.data || []).length === 0 ? (
        <EmptyState title="No EMIs yet" description="Operations generates the schedule after approval." />
      ) : (
        <ul className="space-y-2">
          {(scheduleQuery.data || []).map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-4 text-sm">
              <span>
                EMI {row.sequence} · {formatDate(row.dueDate)}
              </span>
              <span className="flex items-center gap-2">
                {formatInr(row.totalAmount)}
                <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
