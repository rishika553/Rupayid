'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, CalendarClock, FileText, Inbox, Landmark, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@rupayaid/ui';
import { Panel } from '@/components/dashboard/dashboard-widgets';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import type { AdminDashboardStats, AdminKycListItem, AdminLoanListItem } from '@/lib/admin-api-client';
import { formatDateTime, formatInr, statusLabel } from '@/lib/format';

function kycStatusLabel(status: string) {
  if (status === 'REJECTED') return 'Declined';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'Pending review';
  return statusLabel(status);
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => requireAdminApi(adminApiClient.kycStats()),
    staleTime: 15_000,
  });
  const recentKycQuery = useQuery({
    queryKey: ['admin', 'kyc', 'recent'],
    queryFn: () => requireAdminApi(adminApiClient.kycList({ limit: 5 })),
    staleTime: 15_000,
  });
  const recentLoansQuery = useQuery({
    queryKey: ['admin', 'loans', 'recent'],
    queryFn: () => requireAdminApi(adminApiClient.loanList({ limit: 5, status: 'PENDING' })),
    staleTime: 15_000,
  });

  if (statsQuery.isLoading || recentKycQuery.isLoading || recentLoansQuery.isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-32 rounded-[1.25rem]" />
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[1.25rem]" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-[1.25rem]" />
      </div>
    );
  }

  if (statsQuery.isError || recentKycQuery.isError || recentLoansQuery.isError || !statsQuery.data) {
    return (
      <ErrorState
        message="Unable to load the admin dashboard."
        onRetry={() => {
          void statsQuery.refetch();
          void recentKycQuery.refetch();
          void recentLoansQuery.refetch();
        }}
      />
    );
  }

  return (
    <DashboardBody
      stats={statsQuery.data}
      recentKyc={recentKycQuery.data?.data || []}
      recentLoans={recentLoansQuery.data?.data || []}
    />
  );
}

function DashboardBody({
  stats,
  recentKyc,
  recentLoans,
}: {
  stats: AdminDashboardStats;
  recentKyc: AdminKycListItem[];
  recentLoans: AdminLoanListItem[];
}) {
  const kycPending = stats.pendingReview;
  const loansPending = stats.loans?.pendingReview ?? 0;
  const payoutsPending = stats.disbursements?.pending ?? 0;
  const overdue = stats.overdueCount ?? 0;
  const openItems = kycPending + loansPending + payoutsPending;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="portal-card portal-hero relative overflow-hidden p-4 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 hidden size-64 rounded-full border border-emerald-200/60 sm:block"
          aria-hidden
        />
        <div className="relative">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 sm:text-xs">
            Operations overview
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-[-0.04em] text-primary sm:mt-2 sm:text-4xl">
            Admin dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">
            {openItems > 0
              ? `${openItems} item${openItems === 1 ? '' : 's'} waiting for action across KYC, loans and payouts.`
              : 'Nothing is waiting for review right now.'}
            {overdue > 0 ? ` ${overdue} EMI${overdue === 1 ? ' is' : 's are'} overdue.` : ''}
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label="KYC pending"
          value={kycPending}
          detail={`${stats.approved} approved · ${stats.declined} declined`}
          href="/admin/kyc"
          linkLabel="Review KYC"
          attention={kycPending > 0 ? 'warning' : undefined}
        />
        <StatCard
          icon={Landmark}
          label="Loans pending"
          value={loansPending}
          detail={`${stats.loans?.approved ?? 0} approved · ${stats.loans?.rejected ?? 0} rejected`}
          href="/admin/loans"
          linkLabel="Review loans"
          attention={loansPending > 0 ? 'warning' : undefined}
        />
        <StatCard
          icon={Banknote}
          label="Payouts pending"
          value={payoutsPending}
          detail={`${stats.disbursements?.success ?? 0} completed`}
          href="/admin/disbursements"
          linkLabel="Disbursements"
          attention={payoutsPending > 0 ? 'warning' : undefined}
        />
        <StatCard
          icon={CalendarClock}
          label="Overdue EMIs"
          value={overdue}
          detail={overdue > 0 ? 'Installments past their due date.' : 'No overdue installments.'}
          href="/admin/repayments"
          linkLabel="Repayments"
          attention={overdue > 0 ? 'danger' : undefined}
        />
      </section>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Panel
          title="Loan applications to review"
          description={`${stats.loans?.total ?? 0} applications in total`}
          icon={FileText}
          action={<TextLink href="/admin/loans">View all</TextLink>}
        >
          {recentLoans.length === 0 ? (
            <EmptyBlock title="No pending loans" description="Submitted loan applications will appear here." />
          ) : (
            <ul className="-mx-1 divide-y divide-border/70">
              {recentLoans.map((row) => (
                <RowLink
                  key={row.id}
                  href={`/admin/loans/${row.id}`}
                  title={row.customerName}
                  subtitle={`${row.applicationNumber} · ${row.productName}`}
                  meta={formatInr(row.amountRequested)}
                  badge={<Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent KYC"
          description={`${stats.total} applications in total`}
          icon={ShieldCheck}
          action={<TextLink href="/admin/kyc">View all</TextLink>}
        >
          {recentKyc.length === 0 ? (
            <EmptyBlock title="No submitted applications" description="Submitted KYC applications will appear here." />
          ) : (
            <ul className="-mx-1 divide-y divide-border/70">
              {recentKyc.map((row) => (
                <RowLink
                  key={row.id}
                  href={`/admin/kyc/${row.id}`}
                  title={row.customerName}
                  subtitle={row.mobile || '—'}
                  meta={formatDateTime(row.submittedAt)}
                  badge={<Badge tone={statusTone(row.status)}>{kycStatusLabel(row.status)}</Badge>}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  linkLabel,
  attention,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  href: string;
  linkLabel: string;
  attention?: 'warning' | 'danger';
}) {
  return (
    <article
      className={cn(
        'portal-card portal-card-interactive flex h-full flex-col p-4 sm:p-5',
        attention === 'warning' && 'border-amber-200',
        attention === 'danger' && 'border-red-200',
      )}
    >
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
        <span
          className={cn(
            'grid size-7 place-items-center rounded-lg sm:size-8',
            attention === 'danger' ? 'bg-red-50 text-red-600' : 'bg-secondary text-emerald-700',
          )}
        >
          <Icon className="size-3.5 sm:size-4" aria-hidden />
        </span>
        {label}
      </span>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-[-0.03em] text-primary sm:mt-4 sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:mt-1 sm:text-sm sm:leading-6">{detail}</p>
      <div className="mt-auto pt-3 sm:pt-4">
        <TextLink href={href}>{linkLabel}</TextLink>
      </div>
    </article>
  );
}

function RowLink({
  href,
  title,
  subtitle,
  meta,
  badge,
}: {
  href: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-primary">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-xs font-semibold text-primary sm:text-sm">{meta}</span>
          {badge}
        </div>
      </Link>
    </li>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
    >
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center sm:py-8">
      <span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm sm:size-11 sm:rounded-2xl">
        <Inbox className="size-4 sm:size-5" aria-hidden />
      </span>
      <p className="mt-2.5 font-display text-sm font-bold text-primary sm:mt-3 sm:text-base">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">{description}</p>
    </div>
  );
}
