'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RedirectToProduct } from './redirect-to-product';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoanProducts } from '@/hooks/use-customer-data';
import { formatInr, formatPercent, productInterestRate } from '@/lib/format';

export default function ApplyIndexPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <ApplyIndex />
    </Suspense>
  );
}

function ApplyIndex() {
  const searchParams = useSearchParams();
  const preset = searchParams.get('product');
  const query = useLoanProducts();

  if (preset) {
    return <RedirectToProduct productId={preset} />;
  }
  if (query.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (query.error) {
    return <ErrorState message="Unable to load products." onRetry={() => void query.refetch()} />;
  }

  const products = query.data || [];
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products available"
        description="There are no customer loan products to apply for right now."
        actionHref="/loans"
        actionLabel="Back to loans"
      />
    );
  }

  return (
    <div>
      <PageHeader title="Apply for a loan" description="Select a product to start the application steps." />
      <ul className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <li key={product.id}>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription>{product.description || 'Published personal loan terms.'}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <p className="text-sm">
                  {formatInr(product.minAmount)} – {formatInr(product.maxAmount)} · {formatPercent(productInterestRate(product))}
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/loans/apply/${product.id}`}>Continue</Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
