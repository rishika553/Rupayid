'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import {
  useEvaluateEligibility,
  useLoanProducts,
  useMyLoans,
  useSaveLoanDraft,
  useSubmitLoanApplication,
  useUpdateLoanDraft,
} from '@/hooks/use-customer-data';
import { EligibilityResultCard } from '@/components/loans/eligibility-result';
import { formatInr } from '@/lib/format';
import type { EligibilityResult } from '@/lib/types';

const PURPOSES = ['Personal', 'Medical', 'Education', 'Home', 'Business', 'Vehicle', 'Other'] as const;
const EMPLOYMENT = ['Salaried', 'Self-employed', 'Business owner', 'Student', 'Other'] as const;

const schema = z.object({
  amountRequested: z.coerce.number({ invalid_type_error: 'Enter the loan amount' }).positive('Enter the loan amount'),
  tenureMonths: z.coerce
    .number({ invalid_type_error: 'Enter tenure in months' })
    .int('Tenure must be a whole number of months')
    .min(1, 'Enter tenure in months')
    .max(60, 'Tenure cannot be more than 60 months'),
  purpose: z.string().min(1, 'Select the purpose of the loan'),
  employmentType: z.string().min(1, 'Select employment type'),
  monthlyIncome: z.coerce.number({ invalid_type_error: 'Enter monthly income' }).min(1, 'Enter monthly income'),
});

type FormValues = z.infer<typeof schema>;

export function LoanApplyForm() {
  const router = useRouter();
  const { toast } = useToast();
  const productsQuery = useLoanProducts();
  const loansQuery = useMyLoans();
  const saveDraft = useSaveLoanDraft();
  const updateDraft = useUpdateLoanDraft();
  const submitLoan = useSubmitLoanApplication();
  const evaluateEligibility = useEvaluateEligibility();
  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const existingDraft = (loansQuery.data || []).find((row) => row.status === 'DRAFT');
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountRequested: undefined,
      tenureMonths: undefined,
      purpose: '',
      employmentType: '',
      monthlyIncome: undefined,
    },
  });

  const limits = useMemo(() => {
    const list = Array.isArray(productsQuery.data) ? productsQuery.data : [];
    if (!list.length) {
      return null;
    }
    return {
      minAmount: Math.min(...list.map((row) => Number(row.minAmount))),
      maxAmount: Math.max(...list.map((row) => Number(row.maxAmount))),
    };
  }, [productsQuery.data]);

  useEffect(() => {
    if (!existingDraft) {
      return;
    }
    form.reset({
      amountRequested: Number(existingDraft.amountRequested),
      tenureMonths: existingDraft.tenureMonths,
      purpose: '',
      employmentType: '',
      monthlyIncome: undefined,
    });
  }, [existingDraft?.id, existingDraft?.amountRequested, existingDraft?.tenureMonths, form]);

  const watchedAmount = form.watch('amountRequested');
  const selectedProduct = useMemo(() => {
    if (!products.length) {
      return undefined;
    }
    if (!watchedAmount) {
      return products[0];
    }
    return (
      products
        .filter((row) => watchedAmount >= Number(row.minAmount) && watchedAmount <= Number(row.maxAmount))
        .sort((a, b) => Number(b.maxAmount) - Number(a.maxAmount))[0] || products[0]
    );
  }, [products, watchedAmount]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }
    let cancelled = false;
    void evaluateEligibility.mutateAsync(selectedProduct.id).then(
      (result) => {
        if (!cancelled) {
          setEligibility(result);
          setEligibilityError(null);
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setEligibility(null);
          setEligibilityError(error instanceof Error ? error.message : 'Could not check eligibility');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  async function onSubmit(values: FormValues) {
    if (!products.length || !limits) {
      return;
    }
    if (values.amountRequested < limits.minAmount || values.amountRequested > limits.maxAmount) {
      form.setError('amountRequested', {
        message: `Enter an amount between ${formatInr(limits.minAmount)} and ${formatInr(limits.maxAmount)}`,
      });
      return;
    }
    const product = products
      .filter(
        (row) =>
          values.amountRequested >= Number(row.minAmount) && values.amountRequested <= Number(row.maxAmount),
      )
      .sort((a, b) => Number(b.maxAmount) - Number(a.maxAmount))[0];
    if (!product) {
      form.setError('amountRequested', {
        message: `Enter an amount between ${formatInr(limits.minAmount)} and ${formatInr(limits.maxAmount)}`,
      });
      return;
    }
    if (eligibility && !eligibility.eligible) {
      toast({
        title: 'Not eligible yet',
        description: eligibility.reason || 'Complete KYC and profile details, then try again.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const payload = {
        loanProductId: product.id,
        amountRequested: values.amountRequested,
        tenureMonths: values.tenureMonths,
        purpose: values.purpose,
        employmentType: values.employmentType,
        monthlyIncome: values.monthlyIncome,
      };
      const draft = existingDraft
        ? await updateDraft.mutateAsync({ id: existingDraft.id, ...payload })
        : await saveDraft.mutateAsync(payload);
      const submitted = await submitLoan.mutateAsync(draft.id);
      toast({
        title: 'Application submitted',
        description: submitted.applicationNumber,
      });
      router.replace(`/loans/${submitted.id}`);
    } catch (error) {
      toast({
        title: 'Could not submit application',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (productsQuery.isLoading || loansQuery.isLoading) {
    return <Skeleton className="h-72" />;
  }
  if (productsQuery.error || !products.length || !limits) {
    return (
      <ErrorState
        message="Loan applications are not available right now."
        onRetry={() => void productsQuery.refetch()}
      />
    );
  }

  const pending = saveDraft.isPending || updateDraft.isPending || submitLoan.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Loan details</CardTitle>
        <CardDescription>Fill in the required details to apply. KYC must be complete before we can accept the application.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="amountRequested">Loan amount (₹)</Label>
            <Input
              id="amountRequested"
              type="number"
              inputMode="numeric"
              min={limits?.minAmount}
              max={limits?.maxAmount}
              aria-invalid={Boolean(form.formState.errors.amountRequested)}
              {...form.register('amountRequested')}
            />
            {form.formState.errors.amountRequested ? (
              <p className="text-sm text-destructive">{form.formState.errors.amountRequested.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Between {formatInr(limits?.minAmount)} and {formatInr(limits?.maxAmount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenureMonths">Tenure (months)</Label>
            <Input
              id="tenureMonths"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              step={1}
              placeholder="e.g. 18"
              aria-invalid={Boolean(form.formState.errors.tenureMonths)}
              {...form.register('tenureMonths')}
            />
            {form.formState.errors.tenureMonths ? (
              <p className="text-sm text-destructive">{form.formState.errors.tenureMonths.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Choose any repayment period from 1 to 60 months</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of loan</Label>
            <select
              id="purpose"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...form.register('purpose')}
            >
              <option value="">Select purpose</option>
              {PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
            {form.formState.errors.purpose ? (
              <p className="text-sm text-destructive">{form.formState.errors.purpose.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employmentType">Employment type</Label>
            <select
              id="employmentType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...form.register('employmentType')}
            >
              <option value="">Select employment</option>
              {EMPLOYMENT.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {form.formState.errors.employmentType ? (
              <p className="text-sm text-destructive">{form.formState.errors.employmentType.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyIncome">Monthly income (₹)</Label>
            <Input
              id="monthlyIncome"
              type="number"
              inputMode="numeric"
              min={1}
              aria-invalid={Boolean(form.formState.errors.monthlyIncome)}
              {...form.register('monthlyIncome')}
            />
            {form.formState.errors.monthlyIncome ? (
              <p className="text-sm text-destructive">{form.formState.errors.monthlyIncome.message}</p>
            ) : null}
          </div>

          <EligibilityResultCard
            result={eligibility}
            loading={evaluateEligibility.isPending && !eligibility}
            error={eligibilityError}
          />

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.push('/loans')}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || (Boolean(eligibility) && !eligibility?.eligible)}>
              {pending ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
