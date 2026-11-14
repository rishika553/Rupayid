import { View, Text, StyleSheet, Share, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useCustomerDashboard } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Badge,
  Button,
  LoadingScreen,
  SectionHeader,
  StatTile,
  ErrorState,
} from '@/ui/components';
import {
  GradientCard,
  QuickActionCard,
  LoanIllustration,
  ReferralIllustration,
  IconTile,
} from '@/ui/premium';
import { colors, font, spacing } from '@/ui/theme';
import { formatInr, formatDate } from '@/lib/format';
import { kycStatusLabel } from '@/lib/kyc';

export default function DashboardScreen() {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const inline = width >= 350 && fontScale <= 1.2;
  const { data, isLoading, error, refetch, isRefetching } = useCustomerDashboard();
  if (isLoading) return <LoadingScreen />;
  if (error || !data)
    return (
      <ScreenWrapper>
        <ErrorState
          message="We couldn't load your dashboard. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </ScreenWrapper>
    );
  const application = data.loan.currentApplication;
  const activeLoan = data.loan.activeLoan;
  const status = application?.status ?? activeLoan?.status;
  const share = async () => {
    if (!data.referral.code) {
      router.push('/(app)/referral');
      return;
    }
    try {
      await Share.share({
        message: `Join RupayAid with my referral code ${data.referral.code}\nhttps://rupayaid.com/login?ref=${encodeURIComponent(data.referral.code)}`,
      });
    } catch {
      Alert.alert('Unable to share', 'Please try again from the referrals page.');
    }
  };
  const kycStarted = !['NOT_STARTED', 'DRAFT'].includes(data.kyc.status);
  return (
    <ScreenWrapper refreshing={isRefetching} onRefresh={() => void refetch()}>
      <GradientCard tone="soft" style={{ padding: 14 }}>
        <View style={s.row}>
          <IconTile name="shield-checkmark" size={31} success={data.kyc.status === 'APPROVED'} />
          <View style={s.flex}>
            <Text style={s.kycTitle}>KYC Verification</Text>
            <Text style={s.small}>
              {kycStarted
                ? `Status: ${kycStatusLabel(data.kyc.status)}`
                : 'Complete your KYC to unlock loan products and faster disbursement.'}
            </Text>
            {!inline && (
              <Button
                compact
                title={kycStarted ? 'View KYC →' : 'Start KYC →'}
                onPress={() => router.push('/(app)/kyc')}
                style={s.smallButton}
              />
            )}
          </View>
          {inline && (
            <Button
              compact
              title={kycStarted ? 'View KYC →' : 'Start KYC →'}
              onPress={() => router.push('/(app)/kyc')}
              style={s.smallButton}
            />
          )}
        </View>
      </GradientCard>
      <GradientCard>
        <View style={s.row}>
          <View style={s.flex}>
            <View style={s.pill}>
              <Text style={s.pillText}>ϟ Quick & Easy</Text>
            </View>
            <Text style={s.heroTitle}>Apply for a Loan</Text>
            <Text style={s.heroDesc}>Get instant access to flexible loan options, anytime.</Text>
            <Button
              compact
              title="Browse Products →"
              variant="outline"
              onPress={() => router.push('/(app)/loans')}
              style={s.whiteButton}
            />
          </View>
          <LoanIllustration />
        </View>
      </GradientCard>
      <SectionHeader
        title="Quick Actions"
        action={{ label: 'View All →', onPress: () => router.push('/(app)/profile') }}
      />
      <View style={s.actions}>
        <QuickActionCard
          label="Apply"
          icon="create"
          onPress={() => router.push('/(app)/loans/apply')}
        />
        <QuickActionCard
          label="Pay EMI"
          icon="wallet"
          onPress={() => router.push('/(app)/repayments')}
        />
        <QuickActionCard
          label="KYC"
          icon="shield-checkmark"
          onPress={() => router.push('/(app)/kyc')}
        />
        <QuickActionCard
          label="Alerts"
          icon="notifications"
          unread={data.notifications.unreadCount > 0}
          onPress={() => router.push('/(app)/notifications')}
        />
      </View>
      <GradientCard tone="referral" style={{ paddingBottom: 0 }}>
        <View style={s.row}>
          <View style={[s.flex, { paddingBottom: 16 }]}>
            <Text style={s.eyebrow}>REFER A FRIEND</Text>
            <Text style={s.referralTitle}>Refer a Friend</Text>
            <Text style={s.description}>
              Know someone who could use RupayAid? Refer them with their permission.
            </Text>
            <Button
              compact
              title={data.referral.code ? 'Share Now →' : 'View Referrals →'}
              variant="outline"
              onPress={() => void share()}
              style={s.whiteButton}
            />
            <Button title="Submit or track referrals" variant="ghost" compact
              onPress={() => router.push('/(app)/referral')} />
          </View>
          <ReferralIllustration />
        </View>
        {data.referral.code && (
          <View style={s.referralFooter}>
            <Text selectable style={s.code}>
              {data.referral.code}
            </Text>
            <Text style={s.small}>
              {data.referral.referredCount} referred · {data.referral.convertedCount} converted
            </Text>
          </View>
        )}
      </GradientCard>
      <Card>
        <View style={s.row}>
          <IconTile name="briefcase" />
          <View style={s.flex}>
            <Text style={s.small}>Your Application Status</Text>
            <Text style={s.status}>{status ? status.replace(/_/g, ' ') : 'Not Started'}</Text>
            <Text style={s.small}>
              {application?.productName ??
                activeLoan?.productName ??
                'Start your loan journey today!'}
            </Text>
          </View>
        </View>
        <Button
          title={application || activeLoan ? 'View Application →' : 'Start Now →'}
          onPress={() =>
            application || activeLoan
              ? router.push(`/(app)/loans/${(application ?? activeLoan)!.id}`)
              : router.push('/(app)/loans/apply')
          }
          style={{ marginTop: 12 }}
        />
      </Card>
      {activeLoan && (
        <Card onPress={() => router.push(`/(app)/loans/${activeLoan.id}`)}>
          <SectionHeader title="Active loan" subtitle={activeLoan.productName} />
          <View style={s.row}>
            <StatTile label="Outstanding" value={formatInr(activeLoan.outstandingAmount)} />
            <Badge text={activeLoan.status.replace(/_/g, ' ')} variant="success" />
          </View>
        </Card>
      )}
      {data.repayment.nextInstallment && (
        <Card onPress={() => router.push('/(app)/repayments')}>
          <SectionHeader
            title="Next repayment"
            action={{ label: 'Pay EMI →', onPress: () => router.push('/(app)/repayments') }}
          />
          <StatTile
            label={`Installment ${data.repayment.nextInstallment.installmentNumber}`}
            value={formatInr(data.repayment.nextInstallment.amountDue)}
            hint={`Due ${formatDate(data.repayment.nextInstallment.dueDate)}`}
          />
        </Card>
      )}
    </ScreenWrapper>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  kycTitle: { fontSize: 14, color: colors.textPrimary, ...font.semibold },
  small: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: 3 },
  smallButton: {
    marginTop: 0,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
  pill: {
    backgroundColor: '#FFFFFF26',
    borderRadius: 20,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: { color: 'white', fontSize: 11 },
  heroTitle: {
    fontSize: 26,
    lineHeight: 30,
    color: 'white',
    ...font.bold,
    marginTop: 9,
    letterSpacing: -0.7,
  },
  heroDesc: { color: '#DFEDFF', fontSize: 13, lineHeight: 19, marginTop: 8 },
  whiteButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 24,
    borderColor: '#D5E6FC',
  },
  actions: { flexDirection: 'row', gap: 9, marginTop: 4, marginBottom: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: 10, ...font.bold, letterSpacing: 0.6 },
  referralTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    ...font.bold,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  description: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 },
  referralFooter: {
    borderTopWidth: 1,
    borderColor: '#BFE5EC',
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  code: { color: colors.primary, fontSize: 12, ...font.bold },
  status: { color: colors.textPrimary, fontSize: 16, ...font.bold, marginTop: 3 },
});
