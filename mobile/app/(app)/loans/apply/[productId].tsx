import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useLoanProduct,
  useEvaluateEligibility,
  useSaveLoanDraft,
  useUpdateLoanDraft,
  useSubmitLoanApplication,
  useMyLoans,
} from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Button,
  InputField,
  LoadingScreen,
  Badge,
  StepIndicator,
  SectionHeader,
  ErrorState,
} from '@/ui/components';
import { colors, font, spacing, radius } from '@/ui/theme';
import {
  applyFormSchema,
  APPLY_STEPS,
  tenureChoices,
  type ApplyFormValues,
} from '@/lib/loan-apply';
import { formatInr, formatFeeRate, productProcessingFeeRate } from '@/lib/format';
import { LoanCostSummary } from '@/components/loan-cost-summary';
import type { EligibilityResult, LoanApplication } from '@/types';

const STEP_LABELS = APPLY_STEPS.map((s) => s.title) as unknown as string[];

export default function LoanApplyScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useLoanProduct(productId!);
  const myLoans = useMyLoans();
  const saveDraft = useSaveLoanDraft();
  const updateDraft = useUpdateLoanDraft();
  const evaluate = useEvaluateEligibility();
  const submitLoan = useSubmitLoanApplication();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<LoanApplication | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const schema = useMemo(() => applyFormSchema(product ?? undefined), [product]);

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanProductId: productId!,
      amountRequested: product ? Number(product.minAmount) : 0,
      tenureMonths: product?.tenureOptions?.[0] || product?.minTenureMonths || 1,
    },
  });

  const existingDraft = useMemo(
    () =>
      (myLoans.data || []).find(
        (row) => row.loanProduct?.id === productId && row.status === 'DRAFT',
      ),
    [myLoans.data, productId],
  );

  useEffect(() => {
    if (!product) return;
    if (!form.getValues('amountRequested')) {
      form.setValue('amountRequested', Number(product.minAmount));
    }
    if (!form.getValues('tenureMonths')) {
      form.setValue('tenureMonths', product.tenureOptions?.[0] || product.minTenureMonths);
    }
  }, [product, form]);

  useEffect(() => {
    if (!existingDraft) return;
    setDraft(existingDraft);
    form.reset({
      loanProductId: productId!,
      amountRequested: Number(existingDraft.amountRequested),
      tenureMonths: existingDraft.tenureMonths,
    });
  }, [existingDraft, productId, form]);

  const amount = form.watch('amountRequested');
  const tenure = form.watch('tenureMonths');

  async function persistDraft() {
    const values = form.getValues();
    if (draft) {
      const updated = await updateDraft.mutateAsync({
        id: draft.id,
        loanProductId: productId!,
        amountRequested: values.amountRequested,
        tenureMonths: values.tenureMonths,
      });
      setDraft(updated);
      return updated;
    }
    const created = await saveDraft.mutateAsync({
      loanProductId: productId!,
      amountRequested: values.amountRequested,
      tenureMonths: values.tenureMonths,
    });
    setDraft(created);
    return created;
  }

  async function goNext() {
    if (step === 2) {
      const ok = await form.trigger('amountRequested');
      if (!ok) return;
    }
    if (step === 3) {
      const ok = await form.trigger('tenureMonths');
      if (!ok) return;
    }
    if (step === 3) {
      try {
        await persistDraft();
      } catch (e) {
        Alert.alert('Could not save draft', e instanceof Error ? e.message : 'Try again');
        return;
      }
    }
    if (step === 4) {
      setEligibility(null);
      setEligibilityError(null);
      try {
        const result = await evaluate.mutateAsync(productId!);
        setEligibility(result);
      } catch (e) {
        setEligibilityError(e instanceof Error ? e.message : 'Unable to check eligibility');
      }
    }
    setStep((c) => Math.min(7, c + 1));
  }

  async function onSubmitApplication() {
    if (!draft || !eligibility?.eligible) return;
    try {
      const submitted = await submitLoan.mutateAsync(draft.id);
      setDraft(submitted);
      setStep(7);
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Try again');
    }
  }

  if (isLoading) return <LoadingScreen />;
  if (!product) {
    return (
      <ScreenWrapper>
        <Card>
          <Text>Product not found.</Text>
        </Card>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {step < 7 ? <StepIndicator steps={STEP_LABELS} current={step} /> : null}

      <Card>
        <SectionHeader
          title={product.name}
          subtitle={product.description || 'Personal loan terms published by RupayAid.'}
        />

        {step === 1 ? (
          <View style={{ gap: 8 }}>
            <SummaryRow
              label="Amount"
              value={`${formatInr(product.minAmount)} – ${formatInr(product.maxAmount)}`}
            />
            <SummaryRow
              label="Tenure"
              value={`${product.minTenureMonths}–${product.maxTenureMonths} months`}
            />
            <SummaryRow
              label="Processing fee"
              value={formatFeeRate(productProcessingFeeRate(product))}
            />
            {existingDraft ? (
              <View style={{ marginTop: spacing.sm }}>
                <Badge text="Resuming existing draft" variant="info" />
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <InputField
            label={`Loan amount (${formatInr(product.minAmount)} – ${formatInr(product.maxAmount)})`}
            value={amount != null ? String(amount) : ''}
            onChangeText={(t) =>
              form.setValue('amountRequested', Number(t.replace(/\D/g, '')) || 0, {
                shouldValidate: false,
              })
            }
            keyboardType="number-pad"
            error={form.formState.errors.amountRequested?.message}
            placeholder="e.g. 50000"
          />
        ) : null}

        {step === 3 ? (
          <View>
            <Text style={styles.sectionLabel}>Tenure</Text>
            <View style={styles.tenureGrid}>
              {tenureChoices(product).map((months) => {
                const active = Number(tenure) === months;
                return (
                  <TouchableOpacity
                    key={months}
                    onPress={() => form.setValue('tenureMonths', months, { shouldValidate: true })}
                    style={[styles.tenureChip, active && styles.tenureChipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tenureText, active && styles.tenureTextActive]}>
                      {months} mo
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {form.formState.errors.tenureMonths ? (
              <Text style={styles.error}>{form.formState.errors.tenureMonths.message}</Text>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          saveDraft.isPending || updateDraft.isPending ? (
            <Text style={styles.helper}>Saving your draft so RupayAid can quote costs…</Text>
          ) : (
            <LoanCostSummary
              product={product}
              application={draft}
              amount={amount}
              tenureMonths={tenure}
            />
          )
        ) : null}

        {step === 5 ? (
          <View style={{ gap: spacing.md }}>
            {evaluate.isPending ? (
              <Text style={styles.helper}>Checking eligibility…</Text>
            ) : eligibilityError ? (
              <ErrorState message={eligibilityError} onRetry={() => void goNext()} />
            ) : eligibility ? (
              <View style={{ gap: spacing.sm }}>
                <Badge
                  text={eligibility.eligible ? 'Eligible' : 'Not eligible'}
                  variant={eligibility.eligible ? 'success' : 'danger'}
                />
                {eligibility.reason ? (
                  <Text style={styles.helper}>{eligibility.reason}</Text>
                ) : null}
                {eligibility.eligibleAmount ? (
                  <Text style={styles.helper}>
                    Approved up to {formatInr(eligibility.eligibleAmount)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 6 ? (
          <View style={{ gap: spacing.md }}>
            <LoanCostSummary
              product={product}
              application={draft}
              amount={amount}
              tenureMonths={tenure}
            />
            {eligibility ? (
              <View style={{ gap: 6 }}>
                <Badge
                  text={eligibility.eligible ? 'Eligible' : 'Not eligible'}
                  variant={eligibility.eligible ? 'success' : 'danger'}
                />
                {eligibility.reason ? (
                  <Text style={styles.helper}>{eligibility.reason}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 7 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.successTitle}>Your application is in.</Text>
            {draft ? (
              <Text style={styles.helper}>
                Reference <Text style={styles.mono}>{draft.applicationNumber}</Text>
              </Text>
            ) : null}
            <Text style={styles.helper}>
              Track review, decision, and disbursement from your application page.
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.footer}>
        {step === 7 ? (
          <Button
            title="Track application"
            onPress={() => router.replace(draft ? `/(app)/loans/${draft.id}` : '/(app)/loans')}
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => (step === 1 ? router.back() : setStep((c) => c - 1))}
              style={{ flex: 1 }}
            />
            {step < 6 ? (
              <Button
                title={
                  saveDraft.isPending || updateDraft.isPending
                    ? 'Saving…'
                    : evaluate.isPending
                      ? 'Checking…'
                      : 'Continue'
                }
                onPress={() => void goNext()}
                loading={saveDraft.isPending || updateDraft.isPending || evaluate.isPending}
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title={submitLoan.isPending ? 'Submitting…' : 'Submit application'}
                variant="cta"
                onPress={() => void onSubmitApplication()}
                loading={submitLoan.isPending}
                disabled={!eligibility?.eligible || !draft}
                style={{ flex: 1 }}
              />
            )}
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, color: colors.textPrimary, ...font.medium },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    ...font.medium,
    marginBottom: spacing.sm,
  },
  tenureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenureChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 72,
    alignItems: 'center',
  },
  tenureChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tenureText: { fontSize: 13, color: colors.textSecondary, ...font.medium },
  tenureTextActive: { color: colors.textOnPrimary },
  error: { fontSize: 12, color: colors.danger, marginTop: 6 },
  helper: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  successTitle: { fontSize: 17, color: colors.textPrimary, ...font.bold },
  mono: { fontFamily: 'Courier', color: colors.primary, ...font.semibold },
  footer: { marginTop: spacing.md },
});
