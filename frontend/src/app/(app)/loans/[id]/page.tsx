'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoan, useSchedule } from '@/hooks/use-customer-data';
import { formatDate, formatInr, formatPercent, statusLabel } from '@/lib/format';

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const loanQuery = useLoan(params.id);
  const scheduleQuery = useSchedule(params.id);
  const loan = loanQuery.data;

  if (loanQuery.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (loanQuery.error || !loan) {
    return (
      <ErrorState
        message="This loan could not be loaded."
        onRetry={() => void loanQuery.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={loan.applicationNumber}
        description={loan.loanProduct?.name || 'Loan application'}
        action={
          <Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms</CardTitle>
            <CardDescription>Copied from the product at application time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Amount {formatInr(loan.amountRequested)}</p>
            <p>Tenure {loan.tenureMonths} months</p>
            <p>Interest {formatPercent(loan.interestRate)}</p>
            <p>Processing fee {formatInr(loan.processingFee)}</p>
            <p>Submitted {formatDate(loan.submittedAt || loan.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repayment</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : (scheduleQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No EMI schedule yet. It is generated after approval in operations.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(scheduleQuery.data || []).slice(0, 4).map((row) => (
                  <li key={row.id} className="flex justify-between">
                    <span>
                      #{row.sequence} · {formatDate(row.dueDate)}
                    </span>
                    <span>
                      {formatInr(row.totalAmount)} · {statusLabel(row.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/repayments">Full schedule</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
