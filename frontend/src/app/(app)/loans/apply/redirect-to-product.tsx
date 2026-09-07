'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function RedirectToProduct({ productId }: { productId: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/loans/apply/${productId}`);
  }, [productId, router]);
  return <Skeleton className="h-48" />;
}
