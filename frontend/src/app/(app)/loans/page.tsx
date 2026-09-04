'use client';

import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyLoans } from '@/hooks/use-customer-data';
import { formatInr, statusLabel } from '@/lib/format';

export default function LoansPage() {
  const query = useMyLoans();

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState message="Unable to load loans." onRetry={() => void query.refetch()} />;
  }

  const loans = query.data || [];

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Applications you have submitted."
        action={
          <Button asChild>
            <Link href="/loans/apply">New application</Link>
          </Button>
        }
      />
      {loans.length === 0 ? (
        <EmptyState
          title="No applications"
          description="Choose a product and apply in a few steps."
          actionHref="/loans/apply"
          actionLabel="Apply now"
        />
      ) : (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <li key={loan.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{loan.applicationNumber}</CardTitle>
                    <CardDescription>
                      {loan.loanProduct?.name || 'Loan'} · {formatInr(loan.amountRequested)}
                    </CardDescription>
                  </div>
                  <Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/loans/${loan.id}`}>Details</Link>
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
