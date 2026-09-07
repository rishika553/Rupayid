'use client';

import { ApplicationList } from '@/components/loans/application-list';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyLoans } from '@/hooks/use-customer-data';

export default function ApplicationsPage() {
  const query = useMyLoans();

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState message="Unable to load applications." onRetry={() => void query.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track every application from submit through repayment."
      />
      <ApplicationList applications={query.data || []} />
    </div>
  );
}
