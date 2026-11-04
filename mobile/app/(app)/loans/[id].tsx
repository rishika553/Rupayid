import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLoan, useLoanRepaymentSchedule } from '@/hooks/use-customer-data';
import { ScreenWrapper, Card, Badge, Button, LoadingScreen, SectionHeader } from '@/ui/components';
import { colors, font } from '@/ui/theme';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: loan, isLoading } = useLoan(id!);
  const { data: schedule } = useLoanRepaymentSchedule(loan?.id);

  if (isLoading) return <LoadingScreen />;
  if (!loan) return <ScreenWrapper><Card><Text style={s.body}>Loan not found.</Text></Card></ScreenWrapper>;

  const statusVariant = ['ACTIVE', 'DISBURSED', 'APPROVED'].includes(loan.status) ? 'success' as const
    : ['REJECTED', 'DECLINED', 'CLOSED'].includes(loan.status) ? 'danger' as const : 'info' as const;

  return (
    <ScreenWrapper>
      <Card>
        <View style={s.row}>
          <Text style={s.appNum}>{loan.applicationNumber}</Text>
          <Badge text={loan.status.replace(/_/g, ' ')} variant={statusVariant} />
        </View>
        <Text style={s.productName}>{loan.loanProduct?.name ?? 'Loan'}</Text>

        <View style={s.grid}>
          <View style={s.gridItem}>
            <Text style={s.label}>Approved</Text>
            <Text style={s.value}>₹{loan.approvedAmount}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.label}>Outstanding</Text>
            <Text style={s.value}>₹{loan.outstandingAmount}</Text>
          </View>
          <View style={s.gridItem}>
            <Text style={s.label}>Tenure</Text>
            <Text style={s.value}>{loan.tenureMonths} months</Text>
          </View>
          {loan.interestRate != null && (
            <View style={s.gridItem}>
              <Text style={s.label}>Interest</Text>
              <Text style={s.value}>{loan.interestRate}%</Text>
            </View>
          )}
        </View>

        {loan.disbursementDate && (
          <Text style={s.meta}>Disbursed: {loan.disbursementDate.slice(0, 10)}</Text>
        )}
      </Card>

      {loan.nextRepayment && (
        <Card>
          <Text style={s.sectionTitle}>Next Repayment</Text>
          <Text style={s.bigAmount}>₹{loan.nextRepayment.amount}</Text>
          <Text style={s.meta}>Due: {loan.nextRepayment.dueDate.slice(0, 10)}</Text>
          <Badge text={loan.nextRepayment.status.replace(/_/g, ' ')} variant={loan.nextRepayment.status === 'OVERDUE' ? 'danger' : 'info'} />
          <Button
            title="Pay Now"
            onPress={() => router.push('/(app)/repayments')}
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      {loan.costBreakdown && (
        <Card>
          <Text style={s.sectionTitle}>Cost Breakdown</Text>
          {loan.costBreakdown.amount && <Row label="Amount" value={`₹${loan.costBreakdown.amount}`} />}
          {loan.costBreakdown.processingFee && <Row label="Processing Fee" value={`₹${loan.costBreakdown.processingFee}`} />}
          {loan.costBreakdown.estimatedInterest && <Row label="Est. Interest" value={`₹${loan.costBreakdown.estimatedInterest}`} />}
          {loan.costBreakdown.totalPayable && <Row label="Total Payable" value={`₹${loan.costBreakdown.totalPayable}`} bold />}
        </Card>
      )}

      {schedule && schedule.installments.length > 0 && (
        <>
          <SectionHeader title="Repayment Schedule" />
          {schedule.installments.map((inst) => (
            <Card key={inst.installmentNumber}>
              <View style={s.row}>
                <Text style={s.instNum}>#{inst.installmentNumber}</Text>
                <Badge
                  text={inst.status}
                  variant={inst.status === 'PAID' ? 'success' : inst.status === 'OVERDUE' ? 'danger' : 'neutral'}
                />
              </View>
              <View style={s.row}>
                <Text style={s.instAmount}>₹{inst.totalDue}</Text>
                <Text style={s.meta}>{inst.dueDate.slice(0, 10)}</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {loan.timeline && loan.timeline.length > 0 && (
        <>
          <SectionHeader title="Timeline" />
          {loan.timeline.map((event, i) => (
            <View key={i} style={s.timelineItem}>
              <View style={s.timelineDot} />
              <View>
                <Text style={s.timelineText}>{event.fromState} → {event.toState}</Text>
                <Text style={s.meta}>{event.createdAt.slice(0, 10)}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenWrapper>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.breakdownRow}>
      <Text style={s.breakdownLabel}>{label}</Text>
      <Text style={[s.breakdownValue, bold && font.bold]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appNum: { fontSize: 12, color: colors.textMuted, ...font.medium },
  productName: { fontSize: 16, color: colors.textPrimary, ...font.bold, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { minWidth: '40%' },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', ...font.medium },
  value: { fontSize: 15, color: colors.textPrimary, ...font.semibold, marginTop: 2 },
  bigAmount: { fontSize: 22, color: colors.textPrimary, ...font.bold, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  body: { fontSize: 14, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, color: colors.textSecondary, ...font.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  instNum: { fontSize: 13, color: colors.textSecondary, ...font.medium },
  instAmount: { fontSize: 15, color: colors.textPrimary, ...font.semibold },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: colors.textSecondary },
  breakdownValue: { fontSize: 13, color: colors.textPrimary, ...font.semibold },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
  timelineText: { fontSize: 13, color: colors.textPrimary, ...font.medium },
});
