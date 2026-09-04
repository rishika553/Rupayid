'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplyLoan, useLoanProducts } from '@/hooks/use-customer-data';
import { formatInr, formatPercent } from '@/lib/format';
import { useToast } from '@/components/ui/toaster';

const schema = z.object({
  loanProductId: z.string().min(1, 'Select a product'),
  amountRequested: z.coerce.number().positive('Enter an amount'),
  tenureMonths: z.coerce.number().int().positive('Enter tenure in months'),
});

type FormValues = z.infer<typeof schema>;

export default function ApplyLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const productsQuery = useLoanProducts();
  const apply = useApplyLoan();
  const products = productsQuery.data ?? [];
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { loanProductId: '', amountRequested: 50000, tenureMonths: 12 },
  });

  const selectedId = form.watch('loanProductId');
  const selected = useMemo(
    () => products.find((product) => product.id === selectedId),
    [products, selectedId],
  );

  async function onSubmit(values: FormValues) {
    if (selected) {
      const amount = values.amountRequested;
      const tenure = values.tenureMonths;
      if (amount < Number(selected.minAmount) || amount > Number(selected.maxAmount)) {
        form.setError('amountRequested', {
          message: `Amount must be between ${formatInr(selected.minAmount)} and ${formatInr(selected.maxAmount)}`,
        });
        return;
      }
      if (tenure < selected.minTenureMonths || tenure > selected.maxTenureMonths) {
        form.setError('tenureMonths', {
          message: `Tenure must be ${selected.minTenureMonths}–${selected.maxTenureMonths} months`,
        });
        return;
      }
    }
    try {
      const loan = await apply.mutateAsync(values);
      toast({ title: 'Application submitted', description: loan.applicationNumber });
      router.push(`/loans/${loan.id}`);
    } catch (error) {
      toast({
        title: 'Could not apply',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (productsQuery.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (productsQuery.error) {
    return <ErrorState message="Unable to load products." onRetry={() => void productsQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader title="Apply for a loan" description="Pick a product, amount, and tenure. Terms are shown before you submit." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="loanProductId">Product</Label>
                <select
                  id="loanProductId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register('loanProductId')}
                >
                  <option value="">Select</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.loanProductId ? (
                  <p className="text-sm text-destructive">{form.formState.errors.loanProductId.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountRequested">Amount (₹)</Label>
                <Input id="amountRequested" type="number" {...form.register('amountRequested')} />
                {form.formState.errors.amountRequested ? (
                  <p className="text-sm text-destructive">{form.formState.errors.amountRequested.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenureMonths">Tenure (months)</Label>
                <Input id="tenureMonths" type="number" {...form.register('tenureMonths')} />
                {form.formState.errors.tenureMonths ? (
                  <p className="text-sm text-destructive">{form.formState.errors.tenureMonths.message}</p>
                ) : null}
              </div>
              <Button type="submit" disabled={apply.isPending}>
                {apply.isPending ? 'Submitting…' : 'Submit application'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product terms</CardTitle>
            <CardDescription>From the live product catalogue, or sample products if the API is offline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {selected ? (
              <>
                <p>{selected.description}</p>
                <p>
                  Amount {formatInr(selected.minAmount)} – {formatInr(selected.maxAmount)}
                </p>
                <p>
                  Tenure {selected.minTenureMonths}–{selected.maxTenureMonths} months
                </p>
                <p>Interest {formatPercent(selected.baseInterestRate)}</p>
                <p>Processing fee {formatPercent(selected.processingFeeRate)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Select a product to see limits and rates.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
