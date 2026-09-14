'use client';

import Link from 'next/link';
import {
  ArrowRight,
  FileCheck2,
  Landmark,
  ReceiptIndianRupee,
  Share2,
  Wallet,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerDashboard } from '@/hooks/use-customer-data';
import { formatDate, formatDateTime, formatInr, statusLabel } from '@/lib/format';
import { kycStatusLabel } from '@/lib/kyc';

export default function DashboardPage() {
  const query = useCustomerDashboard();
  const dashboard = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40 sm:col-span-2" />
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.error || !dashboard) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Could not load dashboard'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { currentApplication, activeLoan } = dashboard.loan;
  const nextInstallment = dashboard.repayment.nextInstallment;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${dashboard.customer.firstName}`}
        description="Everything that needs your attention, in one place."
      />

      {dashboard.kyc.actionRequired ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <FileCheck2 className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-950">KYC action required</p>
                <p className="text-sm text-amber-900/80">
                  Review your verification status before submitting a loan application.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={dashboard.kyc.actionHref}>{dashboard.kyc.actionLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(dashboard.kyc.actionRequired && 'border-amber-200')}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4" /> KYC
            </CardDescription>
            <CardTitle>
              <Badge tone={statusTone(dashboard.kyc.status)}>
                {kycStatusLabel(dashboard.kyc.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {dashboard.kyc.actionRequired
              ? 'Action required to unlock loan applications.'
              : dashboard.kyc.status === 'APPROVED'
                ? 'Your identity is verified.'
                : 'Your documents are being reviewed.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <ReceiptIndianRupee className="h-4 w-4" /> Current application
            </CardDescription>
            <CardTitle className="text-lg">
              {currentApplication?.applicationNumber || 'No application'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {currentApplication ? (
              <>
                <p className="text-muted-foreground">
                  {currentApplication.productName} · {formatInr(currentApplication.requestedAmount)}
                </p>
                <Badge tone={statusTone(currentApplication.status)}>
                  {statusLabel(currentApplication.status)}
                </Badge>
              </>
            ) : (
              <p className="text-muted-foreground">No application has been started.</p>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Active loan
            </CardDescription>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-3xl">
                  {formatInr(activeLoan?.outstandingAmount || '0.00')}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Total outstanding</p>
              </div>
              {activeLoan ? (
                <Badge tone={statusTone(activeLoan.status)}>{statusLabel(activeLoan.status)}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {activeLoan
              ? `${activeLoan.productName} · ${activeLoan.applicationNumber} · ${activeLoan.tenureMonths} months`
              : 'No active loan. Your balance will appear here after disbursement.'}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Next repayment
            </CardDescription>
            <CardTitle className="text-3xl">
              {nextInstallment ? formatInr(nextInstallment.amountDue) : 'Nothing due'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextInstallment ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Installment {nextInstallment.installmentNumber}
                  </span>
                  <Badge tone={statusTone(nextInstallment.paymentStatus)}>
                    {statusLabel(nextInstallment.paymentStatus)}
                  </Badge>
                </div>
                <p className="text-sm font-medium">Due {formatDate(nextInstallment.dueDate)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                The next installment appears after your schedule is generated.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Recent payments</CardTitle>
              <CardDescription>Your five latest transactions.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/payments">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.payments.recent.length ? (
              <ul className="divide-y">
                {dashboard.payments.recent.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {statusLabel(payment.type)} · {payment.method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(payment.createdAt)}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatInr(payment.amount)}</p>
                      <Badge tone={statusTone(payment.status)}>
                        {statusLabel(payment.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No payment transactions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Referral
          </CardDescription>
          <CardTitle className="font-mono text-2xl tracking-wide">
            {dashboard.referral.code || 'Not generated'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dashboard.referral.referredCount} referred · {dashboard.referral.convertedCount} converted
          {dashboard.referral.referredBy ? ` · Invited by ${dashboard.referral.referredBy}` : ''}
        </CardContent>
      </Card>
    </div>
  );
}
