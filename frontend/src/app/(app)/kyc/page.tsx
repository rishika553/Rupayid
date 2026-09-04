'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/feedback';
import { KycStart, KycWizard } from '@/components/kyc/kyc-wizard';
import { useCreateKyc, useMyKyc } from '@/hooks/use-customer-data';
import { useToast } from '@/components/ui/toaster';

function KycPageInner() {
  const search = useSearchParams();
  const { toast } = useToast();
  const query = useMyKyc();
  const create = useCreateKyc();
  const current = query.data?.[0];
  const requested = Number(search.get('step'));
  const initialStep = Number.isInteger(requested) && requested >= 1 && requested <= 7 ? requested : undefined;

  async function start() {
    try {
      await create.mutateAsync();
      toast({ title: 'KYC started', description: 'Your draft is saved. You can stop and resume later.' });
    } catch (error) {
      toast({
        title: 'Could not start KYC',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (query.error) {
    return <ErrorState message="Unable to load KYC." onRetry={() => void query.refetch()} />;
  }
  if (!current) {
    return <KycStart onStart={() => void start()} pending={create.isPending} />;
  }
  return <KycWizard application={current} initialStep={initialStep} />;
}

export default function KycPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <KycPageInner />
    </Suspense>
  );
}
