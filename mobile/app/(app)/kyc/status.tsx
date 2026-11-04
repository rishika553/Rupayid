import { Text, StyleSheet } from 'react-native';
import { useKycStatus } from '@/hooks/use-customer-data';
import { kycStatusLabel } from '@/lib/kyc';
import { ScreenWrapper, Card, Badge, LoadingScreen } from '@/ui/components';
import { colors, font } from '@/ui/theme';

export default function KycStatusScreen() {
  const { data, isLoading } = useKycStatus();

  if (isLoading) return <LoadingScreen />;
  if (!data) return <ScreenWrapper><Card><Text style={s.body}>Could not load KYC status.</Text></Card></ScreenWrapper>;

  const variant = data.status === 'APPROVED' ? 'success' as const
    : ['REJECTED', 'DECLINED'].includes(data.status) ? 'danger' as const
    : ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(data.status) ? 'info' as const
    : 'neutral' as const;

  return (
    <ScreenWrapper>
      <Card>
        <Text style={s.title}>KYC Status</Text>
        <Badge text={kycStatusLabel(data.status)} variant={variant} />
        {data.referenceCode ? <Text style={s.meta}>Reference: {data.referenceCode}</Text> : null}
        {data.reason ? <Text style={[s.body, { marginTop: 12 }]}>{data.reason}</Text> : null}
        <Text style={s.meta}>Documents: {data.documentCount}</Text>
        {data.submittedAt ? <Text style={s.meta}>Submitted: {data.submittedAt.slice(0, 10)}</Text> : null}
        {data.reviewedAt ? <Text style={s.meta}>Reviewed: {data.reviewedAt.slice(0, 10)}</Text> : null}
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, color: colors.textPrimary, ...font.bold, marginBottom: 8 },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
