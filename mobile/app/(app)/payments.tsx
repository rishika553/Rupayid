import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyPayments, useCustomerDashboard } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Badge,
  LoadingScreen,
  EmptyState,
  SectionHeader,
  Button,
  ErrorState,
} from '@/ui/components';
import { GradientCard, IconTile } from '@/ui/premium';
import { colors, font } from '@/ui/theme';
import { formatInr, formatDate } from '@/lib/format';
function paymentVariant(status: string) {
  if (['CAPTURED', 'SUCCESS', 'COMPLETED'].includes(status)) return 'success' as const;
  if (['FAILED', 'REFUNDED'].includes(status)) return 'danger' as const;
  return 'info' as const;
}
export default function PaymentsScreen() {
  const router = useRouter();
  const history = useMyPayments();
  const dashboard = useCustomerDashboard();
  if (history.isLoading && dashboard.isLoading) return <LoadingScreen />;
  const due = dashboard.data?.repayment.nextInstallment;
  return (
    <ScreenWrapper scroll={false} style={{ padding: 0 }}>
      <FlatList
        data={history.error ? [] : (history.data ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={history.isRefetching || dashboard.isRefetching}
        onRefresh={() => {
          void history.refetch();
          void dashboard.refetch();
        }}
        ListHeaderComponent={
          <>
            <GradientCard>
              <Text style={s.kicker}>PAYMENT OVERVIEW</Text>
              <Text style={s.hero}>
                {due
                  ? formatInr(due.amountDue)
                  : dashboard.isLoading
                    ? 'Loading…'
                    : dashboard.error
                      ? 'Overview unavailable'
                      : 'You’re all up to date'}
              </Text>
              <Text style={s.heroText}>
                {due
                  ? `Next EMI · Due ${formatDate(due.dueDate)}`
                  : 'Manage your repayments and keep track of every transaction.'}
              </Text>
              <Button
                title="View EMIs & Pay →"
                variant="outline"
                onPress={() => router.push('/(app)/repayments')}
                style={{ marginTop: 18 }}
              />
            </GradientCard>
            {dashboard.error && (
              <ErrorState
                message="We couldn't check your upcoming payments."
                onRetry={() => void dashboard.refetch()}
              />
            )}
            {due && (
              <Card>
                <View style={s.row}>
                  <IconTile name="calendar-outline" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>Installment {due.installmentNumber}</Text>
                    <Text style={s.meta}>Due {formatDate(due.dueDate)}</Text>
                  </View>
                  <Badge text={due.paymentStatus.replace(/_/g, ' ')} variant="warning" />
                </View>
                <Button
                  title="Pay EMI →"
                  onPress={() => router.push('/(app)/repayments')}
                  style={{ marginTop: 14 }}
                />
              </Card>
            )}
            <SectionHeader title="Payment history" subtitle="Your repayments and refunds" />
            {history.error && (
              <ErrorState
                message="We couldn't load your payment history."
                onRetry={() => void history.refetch()}
              />
            )}
          </>
        }
        ListEmptyComponent={
          !history.error ? (
            history.isLoading ? (
              <Text style={s.meta}>Loading transactions…</Text>
            ) : (
              <EmptyState
                title="No payments yet"
                description="Your transactions will appear here after your first payment."
              />
            )
          ) : undefined
        }
        renderItem={({ item }) => (
          <Card>
            <View style={s.row}>
              <IconTile
                name={
                  paymentVariant(item.status) === 'success' ? 'checkmark-circle' : 'swap-horizontal'
                }
                success={paymentVariant(item.status) === 'success'}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.type.replace(/_/g, ' ').toLowerCase()}</Text>
                <Text style={s.meta}>{item.method}</Text>
              </View>
              <Text style={s.amount}>{formatInr(item.amount)}</Text>
            </View>
            <View style={s.bottom}>
              <Text style={s.meta}>{formatDate(item.createdAt)}</Text>
              <Badge text={item.status.replace(/_/g, ' ')} variant={paymentVariant(item.status)} />
            </View>
            {item.txRef && (
              <Text selectable style={s.reference}>
                Ref: {item.txRef}
              </Text>
            )}
          </Card>
        )}
      />
    </ScreenWrapper>
  );
}
const s = StyleSheet.create({
  kicker: { color: '#D6E8FF', fontSize: 11, letterSpacing: 1, ...font.semibold },
  hero: { color: 'white', fontSize: 28, ...font.bold, marginTop: 12 },
  heroText: { color: '#DFEDFF', fontSize: 13, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { color: colors.textPrimary, fontSize: 14, ...font.semibold, textTransform: 'capitalize' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  amount: { color: colors.textPrimary, fontSize: 17, ...font.bold },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  reference: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
});
