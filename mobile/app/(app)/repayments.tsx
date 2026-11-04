import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useMyTrackedLoans, useLoanRepaymentSchedule, useCreateRepaymentPayment, useVerifyRepaymentPayment } from '@/hooks/use-customer-data';
import { useAuth } from '@/auth/auth-context';
import { openPaymentCheckout } from '@/lib/payment';
import { ScreenWrapper, Card, Badge, LoadingScreen, EmptyState, SectionHeader, Button } from '@/ui/components';
import { colors, font } from '@/ui/theme';

const PAYABLE_INSTALLMENT = new Set(['DUE', 'PARTIAL', 'OVERDUE', 'PENDING', 'SCHEDULED']);

export default function RepaymentsScreen() {
  const { data: loans, isLoading, refetch } = useMyTrackedLoans();

  if (isLoading) return <LoadingScreen />;

  const activeLoans = (loans ?? []).filter((l) =>
    ['ACTIVE', 'DISBURSED', 'APPROVED'].includes(l.status),
  );

  if (activeLoans.length === 0) {
    return (
      <ScreenWrapper>
        <EmptyState title="No Repayments" message="You don't have any active loans with repayment schedules." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {activeLoans.map((loan) => (
        <LoanScheduleSection
          key={loan.id}
          loanId={loan.id}
          appNumber={loan.applicationNumber}
          productName={loan.loanProduct?.name ?? 'Loan'}
          onPaymentSettled={() => void refetch()}
        />
      ))}
    </ScreenWrapper>
  );
}

function LoanScheduleSection({
  loanId,
  appNumber,
  productName,
  onPaymentSettled,
}: {
  loanId: string;
  appNumber: string;
  productName: string;
  onPaymentSettled?: () => void;
}) {
  const { data: schedule, isLoading, refetch } = useLoanRepaymentSchedule(loanId);
  const { user } = useAuth();
  const createPayment = useCreateRepaymentPayment();
  const verifyPayment = useVerifyRepaymentPayment();
  const [payingNumber, setPayingNumber] = useState<number | null>(null);

  const handlePay = async (installmentNumber: number) => {
    if (payingNumber !== null) return;
    setPayingNumber(installmentNumber);
    try {
      const payment = await createPayment.mutateAsync({
        loanId,
        installmentNumber,
        idempotencyKey: `${loanId}:${installmentNumber}:${Date.now()}`,
      });
      if (!payment.checkout) {
        throw new Error('Checkout is not ready. Please try again shortly.');
      }
      const result = await openPaymentCheckout({
        payment,
        prefill: {
          name: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
          email: user?.email || undefined,
        },
        description: `EMI #${installmentNumber} · ${productName}`,
      });

      if (result.status === 'success') {
        await verifyPayment.mutateAsync({
          paymentId: payment.id,
          razorpayOrderId: result.razorpayOrderId,
          razorpayPaymentId: result.razorpayPaymentId,
          razorpaySignature: result.razorpaySignature,
        });
        await refetch();
        onPaymentSettled?.();
        Alert.alert('Payment received', 'Your repayment has been confirmed.');
      } else if (result.status === 'failed') {
        Alert.alert('Payment failed', result.reason);
      } else {
        Alert.alert('Payment cancelled', 'You can retry whenever you are ready.');
      }
    } catch (err: any) {
      Alert.alert('Payment error', err?.message || 'Could not start payment');
    } finally {
      setPayingNumber(null);
    }
  };

  return (
    <>
      <SectionHeader title={productName} />
      <Text style={s.appNum}>{appNumber}</Text>

      {isLoading ? (
        <Card><Text style={s.body}>Loading schedule...</Text></Card>
      ) : schedule ? (
        <>
          <Card>
            <View style={s.totalsRow}>
              <TotalItem label="Total Due" value={`₹${schedule.totals.totalDue}`} />
              <TotalItem label="Paid" value={`₹${schedule.totals.amountPaid}`} />
              <TotalItem label="Outstanding" value={`₹${schedule.totals.outstanding}`} />
            </View>
          </Card>

          {schedule.nextPayment && (
            <Card>
              <Text style={s.nextLabel}>Next Payment</Text>
              <Text style={s.nextAmount}>₹{schedule.nextPayment.totalDue}</Text>
              <Text style={s.meta}>Due: {schedule.nextPayment.dueDate.slice(0, 10)}</Text>
              <Button
                title={payingNumber === schedule.nextPayment.installmentNumber ? 'Opening checkout...' : 'Pay Now'}
                onPress={() => handlePay(schedule.nextPayment!.installmentNumber)}
                loading={payingNumber === schedule.nextPayment.installmentNumber}
                disabled={payingNumber !== null}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}

          {schedule.installments.map((inst) => {
            const payable = PAYABLE_INSTALLMENT.has(inst.status);
            const isLoadingThis = payingNumber === inst.installmentNumber;
            return (
              <Card key={inst.installmentNumber}>
                <View style={s.instRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.instNum}>EMI #{inst.installmentNumber}</Text>
                    <Text style={s.meta}>{inst.dueDate.slice(0, 10)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.instAmount}>₹{inst.totalDue}</Text>
                    <Badge
                      text={inst.status}
                      variant={inst.status === 'PAID' ? 'success' : inst.status === 'OVERDUE' ? 'danger' : inst.status === 'DUE' ? 'warning' : 'neutral'}
                    />
                  </View>
                </View>
                <View style={s.breakdown}>
                  <Text style={s.breakdownText}>P: ₹{inst.principal}  I: ₹{inst.interest}  F: ₹{inst.fees}</Text>
                </View>
                {payable && (
                  <Button
                    title={isLoadingThis ? 'Opening checkout...' : 'Pay EMI'}
                    variant="outline"
                    onPress={() => handlePay(inst.installmentNumber)}
                    loading={isLoadingThis}
                    disabled={payingNumber !== null}
                    style={{ marginTop: 10, minHeight: 40 }}
                  />
                )}
              </Card>
            );
          })}
        </>
      ) : (
        <Card><Text style={s.body}>Could not load schedule.</Text></Card>
      )}
    </>
  );
}

function TotalItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={s.totalValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  appNum: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  body: { fontSize: 14, color: colors.textSecondary },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', ...font.medium },
  totalValue: { fontSize: 15, color: colors.textPrimary, ...font.bold, marginTop: 2 },
  nextLabel: { fontSize: 12, color: colors.textSecondary, ...font.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  nextAmount: { fontSize: 22, color: colors.textPrimary, ...font.bold },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  instRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  instNum: { fontSize: 14, color: colors.textPrimary, ...font.semibold },
  instAmount: { fontSize: 15, color: colors.textPrimary, ...font.bold, marginBottom: 4 },
  breakdown: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  breakdownText: { fontSize: 11, color: colors.textMuted },
});
