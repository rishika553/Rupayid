import { View, Text, StyleSheet, Alert, TouchableOpacity, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { useCustomerDashboard } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Badge,
  Button,
  LoadingScreen,
  SectionHeader,
  StatTile,
  EmptyState,
} from '@/ui/components';
import { colors, font, spacing, radius } from '@/ui/theme';
import { formatInr, formatDate } from '@/lib/format';

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (['APPROVED', 'ACTIVE', 'DISBURSED'].includes(s)) return 'success' as const;
  if (['REJECTED', 'DECLINED', 'OVERDUE'].includes(s)) return 'danger' as const;
  if (['RESUBMISSION_REQUIRED'].includes(s)) return 'warning' as const;
  if (['SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'PROCESSING'].includes(s)) return 'info' as const;
  return 'neutral' as const;
}

function greetingFor() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface ActionProps {
  label: string;
  icon: string;
  onPress: () => void;
}
function QuickAction({ label, icon, onPress }: ActionProps) {
  return (
    <TouchableOpacity style={s.action} onPress={onPress} activeOpacity={0.75}>
      <View style={s.actionIcon}>
        <Text style={s.actionIconText}>{icon}</Text>
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data, isLoading, refetch } = useCustomerDashboard();

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const shareReferral = async () => {
    if (!data?.referral.code) return;
    try {
      await Share.share({
        message: `Join RupayAid with my referral code ${data.referral.code} and apply for a loan.`,
      });
    } catch {
      // ignore
    }
  };

  if (isLoading) return <LoadingScreen />;

  const name = data?.customer.fullName ?? user?.firstName ?? 'there';
  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  return (
    <ScreenWrapper style={{ paddingBottom: 48 }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{greetingFor()},</Text>
          <Text style={s.name}>{name}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/notifications')} style={s.bell} activeOpacity={0.75}>
          <Text style={s.bellIcon}>🔔</Text>
          {data && data.notifications.unreadCount > 0 ? <View style={s.bellDot} /> : null}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={s.avatar} activeOpacity={0.75}>
          <Text style={s.avatarText}>{initial}</Text>
        </TouchableOpacity>
      </View>

      {!data ? (
        <EmptyState
          title="Could not load dashboard"
          description="Pull to refresh or try again."
          actionTitle="Retry"
          onAction={() => void refetch()}
        />
      ) : (
        <>
          {/* KYC */}
          <Card onPress={() => router.push('/(app)/kyc')} style={s.kycCard}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.cardLabel}>KYC Verification</Text>
                <Text style={s.cardTitle}>
                  {data.kyc.status === 'APPROVED' ? 'Verified' : data.kyc.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <Badge text={data.kyc.status.replace(/_/g, ' ')} variant={statusVariant(data.kyc.status)} />
            </View>
            {data.kyc.actionRequired && data.kyc.actionLabel ? (
              <Text style={s.actionHint}>{data.kyc.actionLabel} →</Text>
            ) : null}
          </Card>

          {/* Loan state */}
          {data.loan.activeLoan ? (
            <Card onPress={() => router.push(`/(app)/loans/${data.loan.activeLoan!.id}`)}>
              <Text style={s.cardLabel}>Active loan</Text>
              <Text style={s.cardTitle}>{data.loan.activeLoan.productName}</Text>
              <View style={[s.rowBetween, { marginTop: spacing.md }]}>
                <StatTile label="Outstanding" value={formatInr(data.loan.activeLoan.outstandingAmount)} />
                <Badge
                  text={data.loan.activeLoan.status.replace(/_/g, ' ')}
                  variant={statusVariant(data.loan.activeLoan.status)}
                />
              </View>
            </Card>
          ) : data.loan.currentApplication ? (
            <Card onPress={() => router.push(`/(app)/loans/${data.loan.currentApplication!.id}`)}>
              <Text style={s.cardLabel}>Loan application</Text>
              <Text style={s.cardTitle}>{data.loan.currentApplication.productName}</Text>
              <View style={[s.rowBetween, { marginTop: spacing.md }]}>
                <StatTile label="Requested" value={formatInr(data.loan.currentApplication.requestedAmount)} />
                <Badge
                  text={data.loan.currentApplication.status.replace(/_/g, ' ')}
                  variant={statusVariant(data.loan.currentApplication.status)}
                />
              </View>
            </Card>
          ) : (
            <Card style={s.ctaCard}>
              <Text style={s.ctaKicker}>Ready when you are</Text>
              <Text style={s.ctaTitle}>Apply for a loan</Text>
              <Text style={s.ctaDesc}>Browse RupayAid products and get a quote in minutes.</Text>
              <Button
                title="Browse products"
                variant="cta"
                onPress={() => router.push('/(app)/loans')}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )}

          {/* Next repayment */}
          {data.repayment.nextInstallment ? (
            <Card onPress={() => router.push('/(app)/repayments')}>
              <Text style={s.cardLabel}>Next repayment</Text>
              <View style={[s.rowBetween, { marginTop: 4 }]}>
                <StatTile
                  label={`Installment ${data.repayment.nextInstallment.installmentNumber}`}
                  value={formatInr(data.repayment.nextInstallment.amountDue)}
                  hint={`Due ${formatDate(data.repayment.nextInstallment.dueDate)}`}
                />
                <Badge
                  text={data.repayment.nextInstallment.paymentStatus.replace(/_/g, ' ')}
                  variant={statusVariant(data.repayment.nextInstallment.paymentStatus)}
                />
              </View>
            </Card>
          ) : null}

          {/* Quick actions */}
          <SectionHeader title="Quick actions" />
          <View style={s.actionsRow}>
            <QuickAction label="Apply" icon="＋" onPress={() => router.push('/(app)/loans')} />
            <QuickAction label="Pay EMI" icon="₹" onPress={() => router.push('/(app)/repayments')} />
            <QuickAction label="KYC" icon="⌾" onPress={() => router.push('/(app)/kyc')} />
            <QuickAction label="Alerts" icon="◉" onPress={() => router.push('/(app)/notifications')} />
          </View>

          {/* Referral */}
          {data.referral.code ? (
            <Card>
              <Text style={s.cardLabel}>Referral</Text>
              <View style={[s.rowBetween, { alignItems: 'flex-end', marginTop: 6 }]}>
                <View>
                  <Text style={s.referralCode}>{data.referral.code}</Text>
                  <Text style={s.referralMeta}>
                    {data.referral.referredCount} referred · {data.referral.convertedCount} converted
                  </Text>
                </View>
                <Button title="Share" variant="outline" onPress={() => void shareReferral()} style={{ minHeight: 40, paddingHorizontal: spacing.lg }} />
              </View>
            </Card>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <Button title="Sign out" variant="ghost" onPress={confirmLogout} />
          </View>
        </>
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  greeting: { fontSize: 13, color: colors.textSecondary },
  name: { fontSize: 22, color: colors.textPrimary, ...font.bold, marginTop: 2 },
  bell: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 16 },
  bellDot: { position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cta, borderWidth: 2, borderColor: colors.surface },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textOnPrimary, ...font.bold, fontSize: 15 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, ...font.semibold, marginBottom: 4 },
  cardTitle: { fontSize: 17, color: colors.textPrimary, ...font.semibold },
  actionHint: { fontSize: 13, color: colors.primary, marginTop: spacing.sm, ...font.semibold },
  kycCard: {},

  ctaCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  ctaKicker: { fontSize: 11, color: '#C7E1DE', textTransform: 'uppercase', letterSpacing: 0.5, ...font.semibold },
  ctaTitle: { fontSize: 20, color: colors.textOnPrimary, ...font.bold, marginTop: 4 },
  ctaDesc: { fontSize: 13, color: '#D7EAE8', marginTop: 6, lineHeight: 18 },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  action: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actionIcon: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionIconText: { fontSize: 18, color: colors.primary, ...font.bold },
  actionLabel: { fontSize: 12, color: colors.textPrimary, ...font.medium },

  referralCode: { fontSize: 22, color: colors.primary, ...font.bold, letterSpacing: 1.5 },
  referralMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
