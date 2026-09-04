'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/feedback';
import { KycStart, KycWizard } from '@/components/kyc/kyc-wizard';
import { useCreateKyc, useMyKyc } from '@/hooks/use-customer-data';
import { isKycEditable } from '@/lib/kyc';
import { useToast } from '@/components/ui/toaster';

export default function KycDocumentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const query = useMyKyc();
  const create = useCreateKyc();
  const current = query.data?.[0];

  useEffect(() => {
    if (current && !isKycEditable(current.status)) {
      router.replace('/kyc/status');
    }
  }, [current, router]);

  async function start() {
    try {
      await create.mutateAsync();
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
    return <ErrorState message="Unable to load documents." onRetry={() => void query.refetch()} />;
  }
  if (!current) {
    return <KycStart onStart={() => void start()} pending={create.isPending} />;
  }
  return <KycWizard application={current} initialStep={5} />;
}
