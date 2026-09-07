import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { formatDate, formatInr, statusLabel } from '@/lib/format';
import type { CustomerRepaymentSchedule } from '@/lib/types';

export function RepaymentSchedulePanel({ schedule }: { schedule: CustomerRepaymentSchedule }) {
  const next = schedule.nextPayment;

  if (schedule.installments.length === 0) {
    return (
      <EmptyState title="No EMIs yet" description="The repayment schedule appears after the loan is disbursed." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next payment</CardDescription>
            <CardTitle className="text-xl">{next ? `Installment ${next.installmentNumber}` : 'None due'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {next ? statusLabel(next.status) : 'All installments are settled'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due date</CardDescription>
            <CardTitle className="text-xl">{next ? formatDate(next.dueDate) : '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Amount due</CardDescription>
            <CardTitle className="text-xl">{next ? formatInr(next.outstanding) : formatInr('0.00')}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid amount</CardDescription>
            <CardTitle className="text-xl">{formatInr(schedule.totals.amountPaid)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Of {formatInr(schedule.totals.totalDue)} billed
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding amount</CardDescription>
            <CardTitle className="text-xl">{formatInr(schedule.totals.outstanding)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Complete schedule</CardTitle>
          <CardDescription>Amounts and status come from the loan record.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {schedule.installments.map((row) => {
              const overdue = row.status === 'OVERDUE';
              return (
                <li
                  key={`${row.installmentNumber}-${row.dueDate}`}
                  className={cn(
                    'rounded-lg border p-4 text-sm',
                    overdue && 'border-red-300 bg-red-50',
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={cn('font-medium', overdue && 'text-red-900')}>
                        Installment {row.installmentNumber} · {formatDate(row.dueDate)}
                      </p>
                      <p className={cn('mt-1 text-muted-foreground', overdue && 'text-red-800/80')}>
                        Principal {formatInr(row.principal)} · Interest {formatInr(row.interest)}
                        {row.fees !== '0.00' ? ` · Fees ${formatInr(row.fees)}` : ''}
                      </p>
                    </div>
                    <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Total due</dt>
                      <dd>{formatInr(row.totalDue)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Paid</dt>
                      <dd>{formatInr(row.amountPaid)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Outstanding</dt>
                      <dd className={cn(overdue && 'font-semibold text-red-900')}>{formatInr(row.outstanding)}</dd>
                    </div>
                  </dl>
                  {row.status !== 'PAID' && row.outstanding !== '0.00' ? (
                    <div className="mt-3">
                      <Button asChild size="sm">
                        <Link href={`/payments?loan=${schedule.loanId}&installment=${row.installmentNumber}`}>
                          Pay this installment
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
