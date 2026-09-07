'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { ApplicationTimeline } from '@/components/loans/application-timeline';
import { RepaymentSchedulePanel } from '@/components/loans/repayment-schedule-panel';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoan, useLoanRepaymentSchedule } from '@/hooks/use-customer-data';
import { formatDate, formatInr, formatPercent, statusLabel } from '@/lib/format';

export default function LoanTrackingPage() {
  const params = useParams<{ id: string }>();
  const query = useLoan(params.id);
  const scheduleQuery = useLoanRepaymentSchedule(params.id);
  const loan = query.data;

  if (query.isLoading) {
    return <Skeleton className="h-72" />;
  }
  if (query.error || !loan) {
    return <ErrorState message="This loan could not be loaded." onRetry={() => void query.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title={loan.applicationNumber}
        description={loan.loanProduct?.name || 'Your loan'}
        action={<Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved amount</CardDescription>
            <CardTitle className="text-xl">{formatInr(loan.approvedAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-xl">{formatInr(loan.outstandingAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next repayment</CardDescription>
            <CardTitle className="text-lg">
              {loan.nextRepayment ? formatInr(loan.nextRepayment.amount) : 'None due'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {loan.nextRepayment ? `${formatDate(loan.nextRepayment.dueDate)} · ${statusLabel(loan.nextRepayment.status)}` : 'No upcoming EMI'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenure</CardDescription>
            <CardTitle className="text-xl">{loan.tenureMonths} months</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
            <CardDescription>Submitted through completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationTimeline application={{ status: loan.status, timeline: loan.timeline }} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial breakdown</CardTitle>
            <CardDescription>Quoted by RupayAid for this loan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>Product {loan.loanProduct?.name || '—'}</p>
            <p>Interest {loan.interestRate ? formatPercent(loan.interestRate) : '—'}</p>
            <p>Processing fee {loan.processingFee ? formatInr(loan.processingFee) : '—'}</p>
            <p>Requested {loan.requestedAmount ? formatInr(loan.requestedAmount) : '—'}</p>
            <p>Applied {formatDate(loan.applicationDate)}</p>
            <p>Approved {formatDate(loan.approvalDate)}</p>
            <p>Disbursed {formatDate(loan.disbursementDate)}</p>
            {loan.costBreakdown?.totalPayable ? (
              <p>Total payable {formatInr(loan.costBreakdown.totalPayable)}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        {scheduleQuery.isLoading ? (
          <Skeleton className="h-48" />
        ) : scheduleQuery.data ? (
          <RepaymentSchedulePanel schedule={scheduleQuery.data} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Repayment schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No EMI schedule yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {(loan.paymentHistory || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {loan.paymentHistory?.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {row.method} · {statusLabel(row.type)}
                    {row.reference ? <span className="block font-mono text-xs text-muted-foreground">{row.reference}</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatInr(row.amount)}
                    <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" size="sm">
              <Link href="/payments">Pay now</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/loans">All loans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
