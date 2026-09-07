'use client';

import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoanProducts, useMyTrackedLoans } from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';

export default function LoansPage() {
  const loansQuery = useMyTrackedLoans();
  const productsQuery = useLoanProducts();
  const loans = loansQuery.data || [];

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
            <Link href="/loans/apply">Apply</Link>
          </Button>
        }
      />

      {loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="Start an application to track it here."
          actionHref="/loans/apply"
          actionLabel="Browse products"
        />
      ) : (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <li key={loan.id}>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{loan.loanProduct?.name || loan.applicationNumber}</CardTitle>
                    <CardDescription>
                      {loan.applicationNumber} · {formatInr(loan.approvedAmount)} · {loan.tenureMonths} months
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

      {!productsQuery.isLoading && (productsQuery.data || []).length > 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Looking for a new product?{' '}
          <Link className="text-primary underline-offset-4 hover:underline" href="/loans/apply">
            Compare and apply
          </Link>
        </p>
      ) : null}
    </div>
  );
}
