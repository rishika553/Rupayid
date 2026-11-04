import { useEffect } from 'react';
import { Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyKyc, useCreateKyc, useSubmitKyc } from '@/hooks/use-customer-data';
import { isKycEditable } from '@/lib/kyc';
import { ScreenWrapper, Card, Button, Badge, LoadingScreen } from '@/ui/components';
import { colors, font } from '@/ui/theme';

export default function KycReviewScreen() {
  const router = useRouter();
  const { data: kycList, isLoading, error, refetch } = useMyKyc();
  const createKyc = useCreateKyc();
  const submitKyc = useSubmitKyc();

  const current = kycList?.[0] ?? null;

  useEffect(() => {
    if (current && !isKycEditable(current.status)) {
      router.replace('/(app)/kyc/status');
    }
  }, [current, router]);

  async function handleStart() {
    try {
      await createKyc.mutateAsync();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not start KYC');
    }
  }

  async function handleSubmit() {
    try {
      await submitKyc.mutateAsync();
      Alert.alert('Submitted', 'Your KYC application has been submitted for review.', [
        { text: 'OK', onPress: () => router.replace('/(app)/kyc/status') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit KYC');
    }
  }

  if (isLoading) return <LoadingScreen />;

  if (error) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Unable to load KYC review.</Text>
          <Button title="Retry" variant="outline" onPress={() => void refetch()} style={{ marginTop: 12 }} />
        </Card>
      </ScreenWrapper>
    );
  }

  if (!current) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={{ fontSize: 18, color: colors.textPrimary, ...font.bold, marginBottom: 8 }}>
            Start KYC Verification
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>
            Complete your KYC to unlock loan products and faster disbursement.
          </Text>
          <Button title="Start KYC" onPress={handleStart} loading={createKyc.isPending} />
        </Card>
      </ScreenWrapper>
    );
  }

  const docs = current.documents || [];
  const hasPersonal = Boolean(current.personal?.dateOfBirth);
  const hasAddress = Boolean(current.address?.addressLine1);
  const hasIdentity = Boolean(current.identity?.panLastFour);
  const hasDocs = docs.length > 0;

  return (
    <ScreenWrapper>
      <Text style={{ fontSize: 18, color: colors.textPrimary, ...font.bold, marginBottom: 16 }}>
        Review & Submit
      </Text>

      <Card>
        <ReviewRow label="Personal Details" done={hasPersonal} />
        <ReviewRow label="Address" done={hasAddress} />
        <ReviewRow label="Identity" done={hasIdentity} />
        <ReviewRow label="Documents" done={hasDocs} detail={`${docs.length} uploaded`} />
      </Card>

      {(!hasPersonal || !hasAddress || !hasIdentity) && (
        <Button
          title="Complete Missing Steps"
          variant="outline"
          onPress={() => router.push('/(app)/kyc')}
          style={{ marginBottom: 12 }}
        />
      )}

      {!hasDocs && (
        <Button
          title="Upload Documents"
          variant="outline"
          onPress={() => router.push('/(app)/kyc/documents')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Button
        title="Submit for Review"
        onPress={handleSubmit}
        loading={submitKyc.isPending}
        disabled={!hasPersonal || !hasAddress || !hasIdentity || !hasDocs}
      />
    </ScreenWrapper>
  );
}

function ReviewRow({ label, done, detail }: { label: string; done: boolean; detail?: string }) {
  return (
    <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, padding: 12, borderWidth: 0 }}>
      <Text style={{ fontSize: 14, color: colors.textPrimary, ...font.medium }}>{label}</Text>
      {done ? (
        <Badge text={detail || 'Done'} variant="success" />
      ) : (
        <Badge text="Incomplete" variant="warning" />
      )}
    </Card>
  );
}
