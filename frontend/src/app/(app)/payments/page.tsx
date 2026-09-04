'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreatePayment, useMyLoans, useMyPayments } from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';
import { useToast } from '@/components/ui/toaster';

const schema = z.object({
  loanApplicationId: z.string().optional(),
  amount: z.coerce.number().positive('Enter an amount'),
  method: z.enum(['UPI', 'NEFT', 'IMPS', 'CARD']),
});

type FormValues = z.infer<typeof schema>;

export default function PaymentsPage() {
  const { toast } = useToast();
  const paymentsQuery = useMyPayments();
  const loansQuery = useMyLoans();
  const create = useCreatePayment();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, method: 'UPI', loanApplicationId: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync({
        loanApplicationId: values.loanApplicationId || undefined,
        amount: values.amount,
        method: values.method,
        type: 'EMI_REPAYMENT',
        direction: 'CREDIT',
      });
      toast({ title: 'Payment initiated', description: 'Gateway confirmation is not connected yet; this records the attempt.' });
      form.reset({ amount: 0, method: 'UPI', loanApplicationId: values.loanApplicationId });
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (paymentsQuery.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (paymentsQuery.error) {
    return <ErrorState message="Unable to load payments." onRetry={() => void paymentsQuery.refetch()} />;
  }

  const payments = paymentsQuery.data || [];

  return (
    <div>
      <PageHeader title="Payments" description="Initiate an EMI payment and review past transactions." />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Pay an EMI</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="loanApplicationId">Loan</Label>
              <select
                id="loanApplicationId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('loanApplicationId')}
              >
                <option value="">Select</option>
                {(loansQuery.data || []).map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.applicationNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" {...form.register('amount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register('method')}
              >
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="IMPS">IMPS</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Processing…' : 'Initiate payment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <EmptyState title="No payments" description="When you pay an EMI, the record will show here." />
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="font-medium">{formatInr(payment.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.method} · {formatDate(payment.createdAt)} · {payment.txRef || payment.id.slice(0, 8)}
                </p>
              </div>
              <Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
