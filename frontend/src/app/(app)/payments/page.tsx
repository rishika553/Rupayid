'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import {
  useCreateRepaymentPayment,
  useLoanRepaymentSchedule,
  useMyPayments,
  useMyTrackedLoans,
  usePayment,
} from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import { useToast } from '@/components/ui/toaster';
import type { CustomerLoan } from '@/lib/types';

const PAYABLE_LOAN_STATUSES = new Set(['DISBURSED', 'ACTIVE', 'DISBURSEMENT_PENDING']);
const PAID_INSTALLMENT = new Set(['PAID', 'WAIVED', 'CANCELLED', 'WRITTEN_OFF']);

function asLoanList(value: unknown): CustomerLoan[] {
  return Array.isArray(value) ? value : [];
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <PaymentsScreen />
    </Suspense>
  );
}

function PaymentsScreen() {
  const { toast } = useToast();
  const { user } = useAuth();
  const search = useSearchParams();
  const paymentsQuery = useMyPayments();
  const loansQuery = useMyTrackedLoans();
  const create = useCreateRepaymentPayment();
  const loans = asLoanList(loansQuery.data).filter(
    (loan) => PAYABLE_LOAN_STATUSES.has(loan.status) || Number(loan.outstandingAmount) > 0,
  );
  const [loanId, setLoanId] = useState(search.get('loan') || '');
  const [installmentNumber, setInstallmentNumber] = useState(search.get('installment') || '');
  const [activePaymentId, setActivePaymentId] = useState('');
  const selectedLoanId = loanId || loans[0]?.id || '';
  const scheduleQuery = useLoanRepaymentSchedule(selectedLoanId);
  const paymentQuery = usePayment(activePaymentId);
  const installments = scheduleQuery.data?.installments || [];
  const payableInstallments = installments.filter((row) => !PAID_INSTALLMENT.has(row.status));
  const selectedInstallment = useMemo(
    () =>
      payableInstallments.find((row) => String(row.installmentNumber) === installmentNumber) ||
      payableInstallments[0],
    [payableInstallments, installmentNumber],
  );

  useEffect(() => {
    if (!loanId && loans[0]?.id) {
      setLoanId(loans[0].id);
    }
  }, [loanId, loans]);

  useEffect(() => {
    if (!installmentNumber && selectedInstallment) {
      setInstallmentNumber(String(selectedInstallment.installmentNumber));
    }
  }, [installmentNumber, selectedInstallment]);

  useEffect(() => {
    if (paymentQuery.data?.status === 'SUCCESS') {
      toast({ title: 'Payment received', description: 'Your repayment has been confirmed.' });
    }
    if (paymentQuery.data?.status === 'FAILED') {
      toast({
        title: 'Payment failed',
        description: 'Try again with the same installment.',
        variant: 'destructive',
      });
    }
  }, [paymentQuery.data?.status, toast]);

  async function onPay() {
    if (!selectedLoanId || !selectedInstallment) {
      return;
    }
    try {
      const payment = await create.mutateAsync({
        loanId: selectedLoanId,
        installmentNumber: selectedInstallment.installmentNumber,
        idempotencyKey: crypto.randomUUID(),
      });
      setActivePaymentId(payment.id);
      if (payment.checkout) {
        await openRazorpayCheckout({
          keyId: payment.checkout.keyId,
          orderId: payment.checkout.orderId,
          amountMinor: payment.checkout.amountMinor,
          currency: payment.checkout.currency,
          name: user ? `${user.firstName} ${user.lastName}` : undefined,
          email: user?.email,
          contact: user?.phoneNumber,
        });
      } else {
        toast({
          title: 'Payment started',
          description: 'Waiting for bank confirmation.',
        });
      }
    } catch (error) {
      toast({
        title: 'Could not start payment',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (paymentsQuery.isLoading || loansQuery.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (paymentsQuery.error) {
    return <ErrorState message="Unable to load payments." onRetry={() => void paymentsQuery.refetch()} />;
  }
  if (loansQuery.error) {
    return <ErrorState message="Unable to load loans." onRetry={() => void loansQuery.refetch()} />;
  }

  const payments = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : [];
  const waiting =
    paymentQuery.data &&
    ['INITIATED', 'PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION'].includes(paymentQuery.data.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Pay an installment. Confirmation comes from the bank, not this screen."
      />

      {loans.length === 0 ? (
        <EmptyState
          title="No loan to pay yet"
          description="EMI payments appear here after a loan is disbursed. Apply for a loan first."
          actionHref="/loans/apply"
          actionLabel="Apply for a loan"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pay an installment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loan">Loan</Label>
              <select
                id="loan"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedLoanId}
                onChange={(event) => {
                  setLoanId(event.target.value);
                  setInstallmentNumber('');
                }}
              >
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.applicationNumber} · {statusLabel(loan.status)}
                  </option>
                ))}
              </select>
            </div>
            {scheduleQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : payableInstallments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There is no payable installment on this loan yet. The schedule appears after disbursement.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="installment">Installment</Label>
                  <select
                    id="installment"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedInstallment ? String(selectedInstallment.installmentNumber) : ''}
                    onChange={(event) => setInstallmentNumber(event.target.value)}
                  >
                    {payableInstallments.map((row) => (
                      <option key={row.installmentNumber} value={row.installmentNumber}>
                        #{row.installmentNumber} · {formatDate(row.dueDate)} · {statusLabel(row.status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount due</p>
                  <p className="text-2xl font-semibold">
                    {selectedInstallment ? formatInr(selectedInstallment.outstanding) : '—'}
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={create.isPending || !selectedInstallment}
                  onClick={() => void onPay()}
                >
                  {create.isPending ? 'Starting…' : 'Pay now'}
                </Button>
              </>
            )}
            {waiting ? (
              <p className="text-sm text-muted-foreground">
                Waiting for confirmation of {formatInr(paymentQuery.data?.amount)}. Do not close this page.
              </p>
            ) : null}
            {paymentQuery.data?.status === 'SUCCESS' ? (
              <p className="text-sm text-emerald-800">
                Payment confirmed for {formatInr(paymentQuery.data.amount)}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {payments.length === 0 ? (
        loans.length === 0 ? null : (
          <EmptyState title="No payments yet" description="When you pay an EMI, the confirmed record will show here." />
        )
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="font-medium">{formatInr(payment.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.method} · {formatDate(payment.createdAt)}
                  {payment.installmentNumber ? ` · Installment ${payment.installmentNumber}` : ''}
                  {payment.txRef ? ` · ${payment.txRef}` : ''}
                </p>
              </div>
              <Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
