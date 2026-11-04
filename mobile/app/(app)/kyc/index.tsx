import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import {
  useMyKyc, useCreateKyc, useUpdateKyc,
} from '@/hooks/use-customer-data';
import {
  KYC_FORM_DEFAULTS, STEP_SCHEMAS, valuesFromKyc, kycPatchBody,
  type KycFormValues, kycFormSchema,
} from '@/lib/kyc-schema';
import { KYC_STEPS, isKycEditable, kycStatusLabel, inferKycStep, writeStoredKycStep, latestDecisionReason } from '@/lib/kyc';
import { ScreenWrapper, Card, Button, InputField, Badge, LoadingScreen, PickerField, DateField } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }, { label: 'Other', value: 'OTHER' },
];
const MARITAL_OPTIONS = [
  { label: 'Single', value: 'SINGLE' }, { label: 'Married', value: 'MARRIED' },
  { label: 'Divorced', value: 'DIVORCED' }, { label: 'Widowed', value: 'WIDOWED' },
];
const RESIDENCE_OPTIONS = [
  { label: 'Owned', value: 'OWNED' }, { label: 'Rented', value: 'RENTED' },
  { label: 'Family', value: 'FAMILY' }, { label: 'PG/Hostel', value: 'PG_HOSTEL' },
];
const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' },
];

export default function KycScreen() {
  const router = useRouter();
  const { data: kycList, isLoading } = useMyKyc();
  const createKyc = useCreateKyc();
  const updateKyc = useUpdateKyc();

  const application = kycList?.[0] ?? null;
  const editable = isKycEditable(application?.status);
  const [step, setStep] = useState(1);

  const form = useForm<KycFormValues>({
    defaultValues: KYC_FORM_DEFAULTS,
    resolver: zodResolver(kycFormSchema),
  });

  useEffect(() => {
    if (application) {
      form.reset(valuesFromKyc(application));
      setStep(inferKycStep(application));
    }
  }, [application?.id]);

  const handleSaveStep = useCallback(async () => {
    const schema = STEP_SCHEMAS[step as keyof typeof STEP_SCHEMAS];
    if (schema) {
      const vals = form.getValues();
      const stepFields = step === 1
        ? { phoneNumber: vals.phoneNumber, dateOfBirth: vals.dateOfBirth, gender: vals.gender, fatherOrSpouseName: vals.fatherOrSpouseName, maritalStatus: vals.maritalStatus }
        : step === 2
        ? { addressLine1: vals.addressLine1, addressLine2: vals.addressLine2, city: vals.city, state: vals.state, pincode: vals.pincode, residenceType: vals.residenceType }
        : step === 3
        ? { panNumber: vals.panNumber, aadhaarNumber: vals.aadhaarNumber, idDocumentType: vals.idDocumentType }
        : { includeBank: vals.includeBank, accountHolderName: vals.accountHolderName, accountLastFour: vals.accountLastFour, ifsc: vals.ifsc, bankName: vals.bankName, accountType: vals.accountType };
      const result = schema.safeParse(stepFields);
      if (!result.success) {
        Alert.alert('Validation', result.error.issues[0].message);
        return;
      }
    }
    try {
      await updateKyc.mutateAsync(kycPatchBody(form.getValues()));
      if (application) await writeStoredKycStep(application.id, step + 1);
      if (step === 4) router.push('/(app)/kyc/documents');
      else if (step < 4) setStep(step + 1);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save');
    }
  }, [step, form, updateKyc, application]);

  if (isLoading) return <LoadingScreen />;

  if (!application) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={st.title}>KYC Verification</Text>
          <Text style={st.body}>Complete your KYC to unlock loan products and faster disbursement.</Text>
          <Button title="Start KYC" onPress={() => createKyc.mutateAsync().catch((e: any) => Alert.alert('Error', e.message))} loading={createKyc.isPending} style={{ marginTop: 16 }} />
        </Card>
      </ScreenWrapper>
    );
  }

  if (!editable) {
    const reason = latestDecisionReason(application);
    return (
      <ScreenWrapper>
        <Card>
          <Text style={st.title}>KYC Verification</Text>
          <Badge text={kycStatusLabel(application.status)} variant={application.status === 'APPROVED' ? 'success' : application.status === 'REJECTED' ? 'danger' : 'info'} />
          {reason ? <Text style={[st.body, { marginTop: 12 }]}>{reason}</Text> : null}
          {application.referenceCode ? <Text style={st.meta}>Reference: {application.referenceCode}</Text> : null}
        </Card>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={st.stepRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[st.stepDot, step >= i && st.stepDotActive]} />
        ))}
      </View>
      <Text style={st.stepTitle}>Step {step}: {KYC_STEPS[step - 1].title}</Text>

      {step === 1 && (
        <>
          <Controller name="phoneNumber" control={form.control} render={({ field, fieldState }) => (
            <InputField label="Mobile Number" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="phone-pad" placeholder="10-digit mobile" />
          )} />
          <Controller name="dateOfBirth" control={form.control} render={({ field, fieldState }) => (
            <DateField
              label="Date of Birth"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              placeholder="Select your date of birth"
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              minimumDate={new Date(1900, 0, 1)}
            />
          )} />
          <Controller name="gender" control={form.control} render={({ field, fieldState }) => (
            <PickerField label="Gender" value={field.value} options={GENDER_OPTIONS} onChange={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller name="fatherOrSpouseName" control={form.control} render={({ field, fieldState }) => (
            <InputField label="Father/Spouse Name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller name="maritalStatus" control={form.control} render={({ field, fieldState }) => (
            <PickerField label="Marital Status" value={field.value} options={MARITAL_OPTIONS} onChange={field.onChange} error={fieldState.error?.message} />
          )} />
        </>
      )}

      {step === 2 && (
        <>
          <Controller name="addressLine1" control={form.control} render={({ field, fieldState }) => (
            <InputField label="Address Line 1" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller name="addressLine2" control={form.control} render={({ field }) => (
            <InputField label="Address Line 2 (optional)" value={field.value} onChangeText={field.onChange} />
          )} />
          <Controller name="city" control={form.control} render={({ field, fieldState }) => (
            <InputField label="City" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller name="state" control={form.control} render={({ field, fieldState }) => (
            <InputField label="State" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )} />
          <Controller name="pincode" control={form.control} render={({ field, fieldState }) => (
            <InputField label="Pincode" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="number-pad" maxLength={6} />
          )} />
          <Controller name="residenceType" control={form.control} render={({ field, fieldState }) => (
            <PickerField label="Residence Type" value={field.value} options={RESIDENCE_OPTIONS} onChange={field.onChange} error={fieldState.error?.message} />
          )} />
        </>
      )}

      {step === 3 && (
        <>
          <Controller name="panNumber" control={form.control} render={({ field, fieldState }) => (
            <InputField
              label="PAN Number"
              value={field.value}
              onChangeText={(t) => field.onChange(t.toUpperCase())}
              error={fieldState.error?.message}
              maxLength={10}
              autoCapitalize="characters"
              placeholder="ABCDE1234F"
            />
          )} />
          <Controller name="aadhaarNumber" control={form.control} render={({ field, fieldState }) => (
            <InputField
              label="Aadhaar Number"
              value={field.value}
              onChangeText={(t) => field.onChange(t.replace(/\D/g, ''))}
              error={fieldState.error?.message}
              keyboardType="number-pad"
              maxLength={12}
              placeholder="12-digit Aadhaar"
            />
          )} />
        </>
      )}

      {step === 4 && (
        <>
          <Controller name="includeBank" control={form.control} render={({ field }) => (
            <Button title={field.value ? 'Bank details included' : 'Add bank details (optional)'} variant={field.value ? 'primary' : 'outline'} onPress={() => field.onChange(!field.value)} style={{ marginBottom: 16 }} />
          )} />
          {form.watch('includeBank') && (
            <>
              <Controller name="accountHolderName" control={form.control} render={({ field, fieldState }) => (
                <InputField label="Account Holder Name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller name="accountLastFour" control={form.control} render={({ field, fieldState }) => (
                <InputField label="Account Number" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="number-pad" />
              )} />
              <Controller name="ifsc" control={form.control} render={({ field, fieldState }) => (
                <InputField label="IFSC Code" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="characters" />
              )} />
              <Controller name="bankName" control={form.control} render={({ field, fieldState }) => (
                <InputField label="Bank Name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
              )} />
              <Controller name="accountType" control={form.control} render={({ field, fieldState }) => (
                <PickerField label="Account Type" value={field.value} options={ACCOUNT_TYPE_OPTIONS} onChange={field.onChange} error={fieldState.error?.message} />
              )} />
            </>
          )}
        </>
      )}

      <View style={st.buttonRow}>
        {step > 1 && <Button title="Back" variant="outline" onPress={() => setStep(step - 1)} style={{ flex: 1, marginRight: 8 }} />}
        <Button title={step === 4 ? 'Next: Documents' : 'Save & Continue'} onPress={handleSaveStep} loading={updateKyc.isPending} style={{ flex: 1 }} />
      </View>
    </ScreenWrapper>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 18, color: colors.textPrimary, ...font.bold, marginBottom: 8 },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  stepDot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary },
  stepTitle: { fontSize: 16, color: colors.textPrimary, ...font.semibold, marginBottom: spacing.lg },
  buttonRow: { flexDirection: 'row', marginTop: spacing.lg },
});
