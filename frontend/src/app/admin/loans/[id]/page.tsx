'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import { formatDate, formatDateTime, formatInr, formatPercent, statusLabel } from '@/lib/format';

const REVIEWABLE = ['SUBMITTED', 'ELIGIBILITY_CHECK', 'UNDER_REVIEW'];
const DISBURSABLE = ['APPROVED', 'DISBURSEMENT_PENDING'];

export default function AdminLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('');
  const [interest, setInterest] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'loans', id],
    enabled: Boolean(id),
    queryFn: () => requireAdminApi(adminApiClient.loanById(id)),
  });

  const loan = query.data;

  useEffect(() => {
    if (!loan) {
      return;
    }
    setAmount(loan.amountRequested);
    setTenure(String(loan.tenureMonths));
    setInterest(String(loan.interestRate));
    setPayoutAmount(loan.approval?.approvedAmount || loan.amountRequested);
  }, [loan]);

  const approve = useMutation({
    mutationFn: () =>
      requireAdminApi(
        adminApiClient.loanApprove(id, {
          approvedAmount: Number(amount),
          approvedTenure: Number(tenure),
          approvedInterest: Number(interest),
        }),
      ),
    onSuccess: async () => {
      toast({ title: 'Loan approved' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loans'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) =>
      toast({
        title: 'Unable to approve',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      }),
  });

  const reject = useMutation({
    mutationFn: () => requireAdminApi(adminApiClient.loanReject(id, rejectReason)),
    onSuccess: async () => {
      toast({ title: 'Loan rejected' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loans'] });
    },
    onError: (error) =>
      toast({
        title: 'Unable to reject',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      }),
  });

  const disburse = useMutation({
    mutationFn: () =>
      requireAdminApi(
        adminApiClient.disbursementInitiate({
          loanApplicationId: id,
          amount: Number(payoutAmount),
          method: 'NEFT',
          beneficiaryBankName: bankName || undefined,
          beneficiaryAccount: account || undefined,
          beneficiaryIfsc: ifsc || undefined,
        }),
      ),
    onSuccess: async () => {
      toast({ title: 'Disbursement started' });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) =>
      toast({
        title: 'Unable to start disbursement',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      }),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !loan) {
    return <ErrorState message="Unable to load this loan." onRetry={() => void query.refetch()} />;
  }

  const canReview = REVIEWABLE.includes(loan.currentState);
  const canDisburse = DISBURSABLE.includes(loan.currentState);

  return (
    <div className="space-y-6">
      <PageHeader
        title={loan.applicationNumber}
        description={`${loan.customer.name} · ${loan.product?.name || 'Loan'}`}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/loans">Back to loans</Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatInr(loan.amountRequested)}</p>
            <p className="text-sm text-muted-foreground">
              {loan.tenureMonths} months · {formatPercent(loan.interestRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>
            <p className="mt-2 text-sm text-muted-foreground">Submitted {formatDateTime(loan.submittedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{loan.customer.name}</p>
            <p className="text-sm text-muted-foreground">{loan.customer.email || '—'}</p>
          </CardContent>
        </Card>
      </section>

      {canReview ? (
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="approvedAmount">Approved amount</Label>
                <Input id="approvedAmount" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvedTenure">Tenure (months)</Label>
                <Input id="approvedTenure" value={tenure} onChange={(event) => setTenure(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvedInterest">Interest</Label>
                <Input id="approvedInterest" value={interest} onChange={(event) => setInterest(event.target.value)} />
              </div>
            </div>
            <Button type="button" disabled={approve.isPending} onClick={() => approve.mutate()}>
              {approve.isPending ? 'Approving…' : 'Approve'}
            </Button>
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reject reason</Label>
              <Input
                id="rejectReason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Required to reject"
              />
              <Button
                type="button"
                variant="outline"
                disabled={reject.isPending || rejectReason.trim().length < 3}
                onClick={() => reject.mutate()}
              >
                {reject.isPending ? 'Rejecting…' : 'Reject'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canDisburse ? (
        <Card>
          <CardHeader>
            <CardTitle>Start disbursement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payoutAmount">Amount</Label>
              <Input id="payoutAmount" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(event) => setBankName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Account (last 4 ok)</Label>
              <Input id="account" value={account} onChange={(event) => setAccount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC</Label>
              <Input id="ifsc" value={ifsc} onChange={(event) => setIfsc(event.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="button" disabled={disburse.isPending} onClick={() => disburse.mutate()}>
                {disburse.isPending ? 'Starting…' : 'Initiate NEFT payout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loan.disbursements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Disbursements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loan.disbursements.map((row) => (
              <p key={row.id}>
                {formatInr(row.amount)} · {row.method} · {statusLabel(row.status)}
                {row.providerReference ? ` · ${row.providerReference}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loan.schedule.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Repayment schedule</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Due</th>
                  <th className="py-2 text-left font-medium">Amount</th>
                  <th className="py-2 text-left font-medium">Paid</th>
                  <th className="py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loan.schedule.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-2">{row.sequence}</td>
                    <td className="py-2">{formatDate(row.dueDate)}</td>
                    <td className="py-2">{formatInr(row.totalAmount)}</td>
                    <td className="py-2">{formatInr(row.paidAmount)}</td>
                    <td className="py-2">{statusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {loan.timeline.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loan.timeline.map((event, index) => (
              <p key={`${event.createdAt}-${index}`}>
                {statusLabel(event.fromState)} → {statusLabel(event.toState)} · {formatDateTime(event.createdAt)}
                {event.reason ? ` · ${event.reason}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
