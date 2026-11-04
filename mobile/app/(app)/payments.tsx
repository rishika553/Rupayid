import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useMyPayments } from '@/hooks/use-customer-data';
import { ScreenWrapper, Card, Badge, LoadingScreen, EmptyState, SectionHeader } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';
import { formatInr, formatDate } from '@/lib/format';

function paymentVariant(status: string) {
  const s = status.toUpperCase();
  if (['CAPTURED', 'SUCCESS', 'COMPLETED'].includes(s)) return 'success' as const;
  if (['FAILED', 'REFUNDED'].includes(s)) return 'danger' as const;
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'info' as const;
  return 'neutral' as const;
}

export default function PaymentsScreen() {
  const { data: payments, isLoading } = useMyPayments();

  if (isLoading) return <LoadingScreen />;

  if (!payments || payments.length === 0) {
    return (
      <ScreenWrapper>
        <SectionHeader title="Payments" subtitle="Repayments and refunds appear here." />
        <EmptyState
          title="No payments yet"
          description="Your payment history will appear here once you make a repayment."
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll={false}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <SectionHeader title="Payments" subtitle={`${payments.length} recorded`} />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>{item.type.replace(/_/g, ' ').toLowerCase()}</Text>
                <Text style={styles.method}>{item.method}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.amount}>{formatInr(item.amount)}</Text>
                <Badge text={item.status} variant={paymentVariant(item.status)} />
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              {item.txRef ? <Text style={styles.ref}>Ref {item.txRef}</Text> : null}
            </View>
          </Card>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  type: { fontSize: 15, color: colors.textPrimary, ...font.semibold, textTransform: 'capitalize' },
  method: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: 17, color: colors.textPrimary, ...font.bold },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  date: { fontSize: 12, color: colors.textMuted },
  ref: { fontSize: 12, color: colors.textMuted },
});
