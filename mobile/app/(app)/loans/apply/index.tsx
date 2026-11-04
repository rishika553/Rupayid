import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useEvaluateEligibility,
  useLoanProducts,
  useMyLoans,
  useSaveLoanDraft,
  useUpdateLoanDraft,
  useSubmitLoanApplication,
} from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Button,
  InputField,
  PickerField,
  LoadingScreen,
  SectionHeader,
  ErrorState,
  Badge,
} from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';
import { formatInr } from '@/lib/format';
import type { EligibilityResult } from '@/types';

const PURPOSES = ['Personal', 'Medical', 'Education', 'Home', 'Business', 'Vehicle', 'Other'] as const;
const EMPLOYMENT = ['Salaried', 'Self-employed', 'Business owner', 'Student', 'Other'] as const;

const PURPOSE_OPTIONS = PURPOSES.map((p) => ({ label: p, value: p }));
const EMPLOYMENT_OPTIONS = EMPLOYMENT.map((e) => ({ label: e, value: e }));

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

export default function LoanApplyIndexScreen() {
  const router = useRouter();
  const productsQuery = useLoanProducts();
  const loansQuery = useMyLoans();
  const saveDraft = useSaveLoanDraft();
  const updateDraft = useUpdateLoanDraft();
  const submitLoan = useSubmitLoanApplication();
  const evaluateEligibility = useEvaluateEligibility();

  const products = productsQuery.data || [];
  const existingDraft = (loansQuery.data || []).find((row) => row.status === 'DRAFT');

  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountRequested: undefined as unknown as number,
      tenureMonths: undefined as unknown as number,
      purpose: '',
      employmentType: '',
      monthlyIncome: undefined as unknown as number,
    },
  });

  const limits = useMemo(() => {
    if (!products.length) return null;
    return {
      minAmount: Math.min(...products.map((row) => Number(row.minAmount))),
      maxAmount: Math.max(...products.map((row) => Number(row.maxAmount))),
    };
  }, [products]);

  useEffect(() => {
    if (!existingDraft) return;
    form.reset({
      amountRequested: Number(existingDraft.amountRequested),
      tenureMonths: existingDraft.tenureMonths,
      purpose: '',
      employmentType: '',
      monthlyIncome: undefined as unknown as number,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDraft?.id]);

  const watchedAmount = form.watch('amountRequested');
  const watchedIncome = form.watch('monthlyIncome');
  const watchedEmployment = form.watch('employmentType');

  const selectedProduct = useMemo(() => {
    if (!products.length) return undefined;
    const amt = Number(watchedAmount);
    if (!amt) return products[0];
    const match = products
      .filter((row) => amt >= Number(row.minAmount) && amt <= Number(row.maxAmount))
      .sort((a, b) => Number(b.maxAmount) - Number(a.maxAmount))[0];
    return match || products[0];
  }, [products, watchedAmount]);

  // Debounced live eligibility (matches web)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedProduct) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;
    debounceRef.current = setTimeout(() => {
      const income = Number(watchedIncome) || undefined;
      const empType = watchedEmployment || undefined;
      evaluateEligibility
        .mutateAsync({
          loanProductId: selectedProduct.id,
          ...(income ? { monthlyIncome: income } : {}),
          ...(empType ? { employmentType: empType } : {}),
        })
        .then(
          (result) => {
            if (!cancelled) {
              setEligibility(result);
              setEligibilityError(null);
            }
          },
          (error) => {
            if (!cancelled) {
              setEligibility(null);
              setEligibilityError(error instanceof Error ? error.message : 'Could not check eligibility');
            }
          },
        );
    }, 500);
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, watchedIncome, watchedEmployment]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!products.length || !limits) return;
    if (values.amountRequested < limits.minAmount || values.amountRequested > limits.maxAmount) {
      form.setError('amountRequested', {
        message: `Enter an amount between ${formatInr(limits.minAmount)} and ${formatInr(limits.maxAmount)}`,
      });
      return;
    }
    const product = products
      .filter((r) => values.amountRequested >= Number(r.minAmount) && values.amountRequested <= Number(r.maxAmount))
      .sort((a, b) => Number(b.maxAmount) - Number(a.maxAmount))[0];
    if (!product) {
      form.setError('amountRequested', {
        message: `Enter an amount between ${formatInr(limits.minAmount)} and ${formatInr(limits.maxAmount)}`,
      });
      return;
    }
    if (eligibility && !eligibility.eligible) {
      Alert.alert('Not eligible yet', eligibility.reason || 'Complete KYC and profile details, then try again.');
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
      router.replace(`/(app)/loans/${submitted.id}`);
    } catch (e) {
      Alert.alert('Could not submit application', e instanceof Error ? e.message : 'Try again');
    }
  });

  if (productsQuery.isLoading || loansQuery.isLoading) return <LoadingScreen />;

  if (productsQuery.error || !products.length || !limits) {
    return (
      <ScreenWrapper>
        <SectionHeader title="Apply for a loan" />
        <ErrorState
          message="Loan applications are not available right now."
          onRetry={() => void productsQuery.refetch()}
        />
      </ScreenWrapper>
    );
  }

  const pending = saveDraft.isPending || updateDraft.isPending || submitLoan.isPending;

  return (
    <ScreenWrapper>
      <SectionHeader title="Apply for a loan" subtitle="Enter the required loan details and submit your application." />

      <Card>
        <Text style={styles.cardTitle}>Loan details</Text>
        <Text style={styles.cardDesc}>
          Fill in the required details to apply. KYC must be complete before we can accept the application.
        </Text>

        <View style={styles.field}>
          <Controller
            name="amountRequested"
            control={form.control}
            render={({ field, fieldState }) => (
              <InputField
                label="Loan amount (₹)"
                value={field.value ? String(field.value) : ''}
                onChangeText={(t) => field.onChange(t ? Number(t.replace(/\D/g, '')) : (undefined as unknown as number))}
                keyboardType="number-pad"
                placeholder={`${limits.minAmount}`}
                error={fieldState.error?.message}
              />
            )}
          />
          {!form.formState.errors.amountRequested ? (
            <Text style={styles.hint}>Between {formatInr(limits.minAmount)} and {formatInr(limits.maxAmount)}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Controller
            name="tenureMonths"
            control={form.control}
            render={({ field, fieldState }) => (
              <InputField
                label="Tenure (months)"
                value={field.value ? String(field.value) : ''}
                onChangeText={(t) => field.onChange(t ? Number(t.replace(/\D/g, '')) : (undefined as unknown as number))}
                keyboardType="number-pad"
                placeholder="e.g. 18"
                maxLength={3}
                error={fieldState.error?.message}
              />
            )}
          />
          {!form.formState.errors.tenureMonths ? (
            <Text style={styles.hint}>Choose any repayment period from 1 to 60 months</Text>
          ) : null}
        </View>

        <Controller
          name="purpose"
          control={form.control}
          render={({ field, fieldState }) => (
            <PickerField
              label="Purpose of loan"
              value={field.value}
              options={PURPOSE_OPTIONS}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="employmentType"
          control={form.control}
          render={({ field, fieldState }) => (
            <PickerField
              label="Employment type"
              value={field.value}
              options={EMPLOYMENT_OPTIONS}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="monthlyIncome"
          control={form.control}
          render={({ field, fieldState }) => (
            <InputField
              label="Monthly income (₹)"
              value={field.value ? String(field.value) : ''}
              onChangeText={(t) => field.onChange(t ? Number(t.replace(/\D/g, '')) : (undefined as unknown as number))}
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />

        {evaluateEligibility.isPending && !eligibility ? (
          <Text style={styles.hint}>Checking eligibility…</Text>
        ) : eligibilityError ? (
          <ErrorState message={eligibilityError} />
        ) : eligibility ? (
          <View style={styles.eligibility}>
            <Badge
              text={eligibility.eligible ? 'Eligible' : 'Not eligible'}
              variant={eligibility.eligible ? 'success' : 'danger'}
            />
            {eligibility.reason ? <Text style={styles.hint}>{eligibility.reason}</Text> : null}
            {eligibility.eligibleAmount ? (
              <Text style={styles.hint}>Approved up to {formatInr(eligibility.eligibleAmount)}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <View style={styles.footer}>
        <Button title="Cancel" variant="outline" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button
          title={pending ? 'Submitting…' : 'Submit application'}
          variant="cta"
          onPress={onSubmit}
          loading={pending}
          disabled={Boolean(eligibility) && !eligibility?.eligible}
          style={{ flex: 1 }}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 17, color: colors.textPrimary, ...font.semibold },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg, lineHeight: 18 },
  field: { marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  eligibility: { gap: spacing.sm, marginTop: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
