'use client';

import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyTrackedLoans } from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';

export default function LoansPage() {
  const loansQuery = useMyTrackedLoans();
  const loans = Array.isArray(loansQuery.data) ? loansQuery.data : [];

  if (loansQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (loansQuery.error) {
    return <ErrorState message="Unable to load your loans." onRetry={() => void loansQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title="Your loans"
        description="Track status, outstanding balance, and the next repayment."
        action={
          <Button asChild>
            <Link href="/loans/apply">Apply for loan</Link>
          </Button>
        }
      />

      {loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="Apply for a loan and track it here."
        />
      ) : (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <li key={loan.id}>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{loan.applicationNumber}</CardTitle>
                    <CardDescription>
                      {formatInr(loan.approvedAmount || loan.requestedAmount || loan.outstandingAmount)} · {loan.tenureMonths} months
                    </CardDescription>
                  </div>
                  <Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>Outstanding {formatInr(loan.outstandingAmount)}</p>
                  <p>
                    Next repayment{' '}
                    {loan.nextRepayment
                      ? `${formatInr(loan.nextRepayment.amount)} on ${formatDate(loan.nextRepayment.dueDate)}`
                      : 'None due'}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/loans/${loan.id}`}>Open loan</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
