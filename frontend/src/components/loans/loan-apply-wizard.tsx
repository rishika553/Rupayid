'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { EligibilityResultCard } from '@/components/loans/eligibility-result';
import { LoanApplyProgress } from '@/components/loans/loan-apply-progress';
import { LoanCostSummary } from '@/components/loans/loan-cost-summary';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import {
  useEvaluateEligibility,
  useMyLoans,
  useSaveLoanDraft,
  useSubmitLoanApplication,
  useUpdateLoanDraft,
} from '@/hooks/use-customer-data';
import { formatInr, formatPercent, productInterestRate } from '@/lib/format';
import { applyFormSchema, type ApplyFormValues } from '@/lib/loan-apply';
import type { EligibilityResult, LoanApplication, LoanProduct } from '@/lib/types';

export function LoanApplyWizard({ product }: { product: LoanProduct }) {
  const router = useRouter();
  const { toast } = useToast();
  const loansQuery = useMyLoans();
  const saveDraft = useSaveLoanDraft();
  const updateDraft = useUpdateLoanDraft();
  const submitLoan = useSubmitLoanApplication();
  const evaluate = useEvaluateEligibility();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<LoanApplication | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const schema = useMemo(() => applyFormSchema(product), [product]);
  const existingDraft = (loansQuery.data || []).find(
    (row) => row.loanProduct?.id === product.id && row.status === 'DRAFT',
  );
  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanProductId: product.id,
      amountRequested: Number(product.minAmount),
      tenureMonths: product.tenureOptions?.[0] || product.minTenureMonths,
    },
  });

  useEffect(() => {
    if (!existingDraft) {
      return;
    }
    setDraft(existingDraft);
    form.reset({
      loanProductId: product.id,
      amountRequested: Number(existingDraft.amountRequested),
      tenureMonths: existingDraft.tenureMonths,
    });
  }, [existingDraft, form, product.id]);

  const amount = form.watch('amountRequested');
  const tenure = form.watch('tenureMonths');
  const tenureChoices = product.tenureOptions?.length
    ? product.tenureOptions
    : Array.from({ length: product.maxTenureMonths - product.minTenureMonths + 1 }, (_, index) => product.minTenureMonths + index);

  async function persistDraft() {
    const values = form.getValues();
    const saved = draft
      ? await updateDraft.mutateAsync({
          id: draft.id,
          loanProductId: product.id,
          amountRequested: values.amountRequested,
          tenureMonths: values.tenureMonths,
        })
      : await saveDraft.mutateAsync(values);
    setDraft(saved);
    return saved;
  }

  async function goNext() {
    if (step === 2 && !(await form.trigger('amountRequested'))) {
      return;
    }
    if (step === 3 && !(await form.trigger('tenureMonths'))) {
      return;
    }
    if (step === 3) {
      try {
        await persistDraft();
      } catch (error) {
        toast({
          title: 'Could not save draft',
          description: error instanceof Error ? error.message : 'Try again',
          variant: 'destructive',
        });
        return;
      }
    }
    if (step === 4) {
      setEligibility(null);
      setEligibilityError(null);
      try {
        const result = await evaluate.mutateAsync(product.id);
        setEligibility(result);
      } catch (error) {
        setEligibilityError(error instanceof Error ? error.message : 'Unable to check eligibility');
      }
    }
    setStep((current) => Math.min(7, current + 1));
  }

  async function onSubmitApplication() {
    if (!draft || !eligibility?.eligible) {
      return;
    }
    try {
      const submitted = await submitLoan.mutateAsync(draft.id);
      setDraft(submitted);
      setStep(7);
      toast({ title: 'Application submitted', description: submitted.applicationNumber });
    } catch (error) {
      toast({
        title: 'Could not submit',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  return (
    <div>
      <LoanApplyProgress current={step} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <CardDescription>{product.description || 'Personal loan terms published by RupayAid.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-3 text-sm">
              <p>Amount {formatInr(product.minAmount)} – {formatInr(product.maxAmount)}</p>
              <p>Tenure {product.minTenureMonths}–{product.maxTenureMonths} months</p>
              <p>Interest {formatPercent(productInterestRate(product))}</p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-2">
              <Label htmlFor="amountRequested">Loan amount (₹)</Label>
              <Input
                id="amountRequested"
                type="number"
                inputMode="numeric"
                min={Number(product.minAmount)}
                max={Number(product.maxAmount)}
                aria-invalid={Boolean(form.formState.errors.amountRequested)}
                {...form.register('amountRequested')}
              />
              {form.formState.errors.amountRequested ? (
                <p className="text-sm text-destructive" role="alert">{form.formState.errors.amountRequested.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Between {formatInr(product.minAmount)} and {formatInr(product.maxAmount)}
                </p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Tenure</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {tenureChoices.map((months) => (
                  <label
                    key={months}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      value={months}
                      checked={Number(tenure) === months}
                      onChange={() => form.setValue('tenureMonths', months, { shouldValidate: true })}
                    />
                    {months} months
                  </label>
                ))}
              </div>
              {form.formState.errors.tenureMonths ? (
                <p className="text-sm text-destructive" role="alert">{form.formState.errors.tenureMonths.message}</p>
              ) : null}
            </fieldset>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              {saveDraft.isPending || updateDraft.isPending ? (
                <p className="text-sm text-muted-foreground">Saving your draft so RupayAid can quote costs…</p>
              ) : (
                <LoanCostSummary product={product} application={draft} amount={amount} tenureMonths={tenure} />
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <EligibilityResultCard
              result={eligibility}
              loading={evaluate.isPending}
              error={eligibilityError}
            />
          ) : null}

          {step === 6 ? (
            <div className="space-y-4">
              <LoanCostSummary product={product} application={draft} amount={amount} tenureMonths={tenure} />
              {eligibility ? <EligibilityResultCard result={eligibility} /> : null}
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-3 text-sm">
              <p className="text-base font-medium">Your application is in.</p>
              <p>
                Reference <span className="font-mono">{draft?.applicationNumber}</span>
              </p>
              <p className="text-muted-foreground">Track review, decision, and disbursement from your application page.</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step === 7 ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={draft ? `/loans/${draft.id}` : '/loans'}>Track application</Link>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => (step === 1 ? router.push('/loans/apply') : setStep((current) => current - 1))}
                >
                  Back
                </Button>
                {step < 6 ? (
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={saveDraft.isPending || updateDraft.isPending || evaluate.isPending}
                    onClick={() => void goNext()}
                  >
                    {saveDraft.isPending || updateDraft.isPending
                      ? 'Saving quote…'
                      : evaluate.isPending
                        ? 'Checking eligibility…'
                        : 'Continue'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={submitLoan.isPending || !eligibility?.eligible || !draft}
                    onClick={() => void onSubmitApplication()}
                  >
                    {submitLoan.isPending ? 'Submitting…' : 'Submit application'}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
