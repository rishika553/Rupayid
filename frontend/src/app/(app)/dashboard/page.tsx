'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Button } from '@rupayaid/ui';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyKyc, useMyLoans, useMyReferral, useSchedule } from '@/hooks/use-customer-data';
import { formatDate, formatInr, statusLabel } from '@/lib/format';
import { kycStatusLabel } from '@/lib/kyc';

export default function DashboardPage() {
  const { user } = useAuth();
  const kycQuery = useMyKyc();
  const loansQuery = useMyLoans();
  const referralQuery = useMyReferral();

  const kyc = kycQuery.data?.[0];
  const loans = loansQuery.data || [];
  const activeLoan = loans.find((loan) =>
    ['APPROVED', 'DISBURSED', 'ACTIVE', 'PARTIALLY_PAID', 'ACCEPTED'].includes(loan.status),
  ) || loans[0];
  const latestApplication = loans[0];
  const scheduleQuery = useSchedule(activeLoan?.id);

  const nextEmi = (scheduleQuery.data || [])
    .filter((row) => ['SCHEDULED', 'PAST_DUE', 'PARTIALLY_PAID'].includes(row.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const outstanding = (scheduleQuery.data || [])
    .filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED' && row.status !== 'CANCELLED')
    .reduce((sum, row) => sum + Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)), 0);

  const loading = kycQuery.isLoading || loansQuery.isLoading;
  const error = kycQuery.error || loansQuery.error;

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40 sm:col-span-2" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Could not load dashboard'}
        onRetry={() => {
          void kycQuery.refetch();
          void loansQuery.refetch();
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.firstName || 'there'}`}
        description="Your KYC, loan, and repayment snapshot."
        action={
          <Button asChild>
            <Link href="/loans/apply">Apply for a loan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>KYC status</CardDescription>
            <CardTitle className="text-xl">
              <Badge tone={statusTone(kyc?.status || 'DRAFT')}>
                {kycStatusLabel(kyc?.status || 'DRAFT')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="text-sm text-primary underline-offset-4 hover:underline" href="/kyc/status">
              View KYC
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Application status</CardDescription>
            <CardTitle className="text-xl">
              {latestApplication ? (
                <Badge tone={statusTone(latestApplication.status)}>{statusLabel(latestApplication.status)}</Badge>
              ) : (
                'None yet'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {latestApplication?.applicationNumber || 'Start an application when you are ready.'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-xl">{formatInr(outstanding)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Unpaid EMI balance on the active loan.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Referrals</CardDescription>
            <CardTitle className="text-xl">{referralQuery.data?.referredCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            People who signed up with your code
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Invite someone</CardTitle>
          <CardDescription>
            Each customer gets one unique code at account creation. Rewards are not part of this release.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-lg font-semibold tracking-wide">{referralQuery.data?.code || '—'}</p>
            <p className="text-sm text-muted-foreground">
              {referralQuery.data?.referredCount ?? 0} sign-up{(referralQuery.data?.referredCount ?? 0) === 1 ? '' : 's'} with your code
              {referralQuery.data?.referredBy
                ? ` · You joined via ${referralQuery.data.referredBy.firstName}`
                : ''}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/referral">Open referrals</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active loan</CardTitle>
            <CardDescription>Disbursed or in repayment.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeLoan ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{activeLoan.applicationNumber}</p>
                <p>{formatInr(activeLoan.amountRequested)} · {activeLoan.tenureMonths} months</p>
                <Badge tone={statusTone(activeLoan.status)}>{statusLabel(activeLoan.status)}</Badge>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/loans/${activeLoan.id}`}>Open loan</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No active loan"
                description="When a loan is approved and disbursed, it will appear here."
                actionHref="/loans/apply"
                actionLabel="Browse products"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next repayment</CardTitle>
            <CardDescription>Upcoming EMI and status.</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduleQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : nextEmi ? (
              <div className="space-y-2 text-sm">
                <p className="text-2xl font-semibold">{formatInr(nextEmi.totalAmount)}</p>
                <p>Due {formatDate(nextEmi.dueDate)}</p>
                <Badge tone={statusTone(nextEmi.status)}>{statusLabel(nextEmi.status)}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/repayments">View schedule</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming EMI. Schedules appear after disbursement.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
