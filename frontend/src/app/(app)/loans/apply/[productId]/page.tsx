'use client';

import { useParams } from 'next/navigation';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { LoanApplyWizard } from '@/components/loans/loan-apply-wizard';
import { useLoanProduct } from '@/hooks/use-customer-data';

export default function ApplyProductPage() {
  const params = useParams<{ productId: string }>();
  const query = useLoanProduct(params.productId);

  if (query.isLoading) {
    return <Skeleton className="h-72" />;
  }
  if (query.error || !query.data) {
    return (
      <ErrorState
        message="This loan product is not available."
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Apply for a loan"
        description="Complete each step. Costs and eligibility come from RupayAid, not from this screen."
      />
      <LoanApplyWizard product={query.data} />
    </div>
  );
}
