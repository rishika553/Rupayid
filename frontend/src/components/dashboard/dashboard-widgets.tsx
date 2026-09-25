'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CircleDashed,
  Copy,
  FileText,
  Gift,
  Landmark,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime, formatInr, statusLabel } from '@/lib/format';
import { kycStatusLabel } from '@/lib/kyc';
import type {
  CustomerDashboard,
  CustomerRepaymentSchedule,
  LoanApplication,
  NotificationRecord,
} from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('portal-card flex flex-col p-4 sm:p-6', className)}>
      <header className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          {Icon ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-emerald-700 sm:size-9 sm:rounded-xl">
              <Icon className="size-4 sm:size-[18px]" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold tracking-[-0.02em] text-primary sm:text-lg">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-semibold sm:text-sm text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export function CtaLink({
  href,
  children,
  variant = 'cta',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: 'cta' | 'outline';
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold sm:px-5 sm:py-2.5 sm:text-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transform-none',
        variant === 'cta'
          ? 'bg-cta text-cta-foreground shadow-[0_10px_25px_-12px_rgba(224,104,69,.7)] hover:bg-cta/90'
          : 'border border-border bg-white/80 text-primary hover:bg-white',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-5 text-center sm:px-5 sm:py-8">
      <span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm sm:size-11 sm:rounded-2xl">
        <Icon className="size-4 sm:size-5" aria-hidden />
      </span>
      <p className="mt-2.5 font-display text-sm font-bold text-primary sm:mt-3 sm:text-base">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm">{description}</p>
      {action ? <div className="mt-3 sm:mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome                                                             */
/* ------------------------------------------------------------------ */

export function WelcomeSection({ dashboard }: { dashboard: CustomerDashboard }) {
  const { kyc } = dashboard;
  const { currentApplication, activeLoan } = dashboard.loan;
  const next = dashboard.repayment.nextInstallment;

  let message = 'Everything that needs your attention, in one place.';
  if (kyc.actionRequired) {
    message = 'Complete your KYC verification to unlock loan applications.';
  } else if (next) {
    message = `Your next installment of ${formatInr(next.amountDue)} is due on ${formatDate(next.dueDate)}.`;
  } else if (currentApplication && !activeLoan) {
    message = `Application ${currentApplication.applicationNumber} is ${statusLabel(currentApplication.status).toLowerCase()}.`;
  } else if (kyc.status === 'APPROVED' && !currentApplication) {
    message = 'Your identity is verified. You can apply for a loan whenever you need one.';
  }

  return (
    <section className="portal-card portal-hero relative overflow-hidden p-4 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 hidden size-64 rounded-full border border-emerald-200/60 sm:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-4 top-10 hidden size-40 rounded-full border border-emerald-200/50 sm:block"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 sm:text-xs">
            {greeting()}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-[-0.04em] text-primary sm:mt-2 sm:text-4xl sm:tracking-[-0.045em]">
            Welcome back, {dashboard.customer.firstName || 'there'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <CtaLink href="/loans/apply">
            Apply for a loan <ArrowRight className="size-4" aria-hidden />
          </CtaLink>
          {kyc.actionRequired && kyc.actionLabel ? (
            <CtaLink href={kyc.actionHref} variant="outline">
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
              {kyc.actionLabel}
            </CtaLink>
          ) : (
            <CtaLink href="/loans" variant="outline">
              View my loans
            </CtaLink>
          )}
        </div>
      </div>
    </section>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ------------------------------------------------------------------ */
/* Summary cards                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  icon: Icon,
  label,
  badge,
  value,
  detail,
  href,
  linkLabel,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  badge?: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  href: string;
  linkLabel: string;
  highlight?: 'warning' | 'danger';
}) {
  return (
    <article
      className={cn(
        'portal-card portal-card-interactive flex h-full flex-col p-4 sm:min-h-[196px] sm:p-5',
        highlight === 'warning' && 'border-amber-200',
        highlight === 'danger' && 'border-red-200',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
          <span className="grid size-7 place-items-center rounded-lg bg-secondary text-emerald-700 sm:size-8">
            <Icon className="size-3.5 sm:size-4" aria-hidden />
          </span>
          {label}
        </span>
        {badge}
      </div>
      <div className="mt-3 font-display text-lg font-extrabold tracking-[-0.03em] text-primary sm:mt-4 sm:text-2xl">{value}</div>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:mt-1 sm:text-sm sm:leading-6">{detail}</p>
      <div className="mt-auto pt-3 sm:pt-4">
        <TextLink href={href}>{linkLabel}</TextLink>
      </div>
    </article>
  );
}

const KYC_MESSAGES: Record<string, string> = {
  APPROVED: 'Your identity is verified.',
  SUBMITTED: 'Submitted. Your documents are waiting for review.',
  UNDER_REVIEW: 'Our team is reviewing your documents.',
  REJECTED: 'Verification was not approved. See the reason.',
  MORE_INFO_REQUIRED: 'We need a little more information from you.',
  RESUBMISSION_REQUIRED: 'Please update your details and resubmit.',
  NOT_STARTED: 'Verify your identity to unlock loan applications.',
};

export function SummaryCards({ dashboard }: { dashboard: CustomerDashboard }) {
  const { kyc } = dashboard;
  const { currentApplication, activeLoan } = dashboard.loan;
  const next = dashboard.repayment.nextInstallment;
  const kycTone = statusTone(kyc.status);

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <SummaryCard
        icon={ShieldCheck}
        label="KYC"
        badge={<Badge tone={kycTone}>{kycStatusLabel(kyc.status)}</Badge>}
        value={kyc.status === 'APPROVED' ? 'Verified' : kyc.actionRequired ? 'Action needed' : 'In review'}
        detail={KYC_MESSAGES[kyc.status] || 'Finish your KYC to unlock loan applications.'}
        href={kyc.actionHref}
        linkLabel={kyc.actionLabel || 'View KYC status'}
        highlight={kycTone === 'danger' ? 'danger' : kyc.actionRequired ? 'warning' : undefined}
      />

      {currentApplication ? (
        <SummaryCard
          icon={FileText}
          label="Loan application"
          badge={<Badge tone={statusTone(currentApplication.status)}>{statusLabel(currentApplication.status)}</Badge>}
          value={formatInr(currentApplication.requestedAmount)}
          detail={
            <>
              {currentApplication.productName} · {currentApplication.applicationNumber}
              <br />
              Applied {formatDate(currentApplication.appliedAt)}
            </>
          }
          href={`/loans/${currentApplication.id}`}
          linkLabel="Track application"
        />
      ) : (
        <SummaryCard
          icon={FileText}
          label="Loan application"
          value="None open"
          detail="You don't have an application in progress."
          href="/loans/apply"
          linkLabel="Apply for a loan"
        />
      )}

      {activeLoan ? (
        <SummaryCard
          icon={Landmark}
          label="Active loan"
          badge={<Badge tone={statusTone(activeLoan.status)}>{statusLabel(activeLoan.status)}</Badge>}
          value={formatInr(activeLoan.outstandingAmount)}
          detail={`Outstanding of ${formatInr(activeLoan.approvedAmount)} · ${activeLoan.tenureMonths} months`}
          href={`/loans/${activeLoan.id}`}
          linkLabel="View loan"
        />
      ) : (
        <SummaryCard
          icon={Landmark}
          label="Active loan"
          value="No active loan"
          detail="Your outstanding balance appears here after disbursement."
          href="/loans"
          linkLabel="My loans"
        />
      )}

      {next ? (
        <SummaryCard
          icon={CalendarClock}
          label="Next repayment"
          badge={<Badge tone={statusTone(next.paymentStatus)}>{statusLabel(next.paymentStatus)}</Badge>}
          value={formatInr(next.amountDue)}
          detail={`Installment ${next.installmentNumber} · due ${formatDate(next.dueDate)}`}
          href="/repayments"
          linkLabel="Pay or view schedule"
          highlight={statusTone(next.paymentStatus) === 'danger' ? 'danger' : undefined}
        />
      ) : (
        <SummaryCard
          icon={CalendarClock}
          label="Next repayment"
          value="Nothing due"
          detail="Your next installment appears once a repayment schedule is generated."
          href="/repayments"
          linkLabel="Repayments"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Application progress tracker                                       */
/* ------------------------------------------------------------------ */

const WORKFLOW = [
  { status: 'DRAFT', label: 'Started' },
  { status: 'ELIGIBILITY_CHECK', label: 'Eligibility check' },
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'UNDER_REVIEW', label: 'Under review' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'DISBURSEMENT_PENDING', label: 'Disbursement' },
  { status: 'DISBURSED', label: 'Disbursed' },
  { status: 'ACTIVE', label: 'Repaying' },
] as const;

const STATUS_MESSAGES: Record<string, string> = {
  DRAFT: 'Your application is saved as a draft. Submit it when you are ready.',
  ELIGIBILITY_CHECK: 'We are checking your eligibility for this loan.',
  SUBMITTED: 'Submitted and waiting for review.',
  UNDER_REVIEW: 'Our team is reviewing your application.',
  APPROVED: 'Approved. Disbursement will be arranged next.',
  DISBURSEMENT_PENDING: 'Funds are being sent to your verified bank account.',
  DISBURSED: 'Funds have been sent to your verified bank account.',
  ACTIVE: 'Your loan is active. Keep up with your repayments.',
  CLOSED: 'This loan is fully repaid and closed.',
  REJECTED: 'This application was not approved.',
  CANCELLED: 'This application was cancelled.',
};

type TrackedApplication = {
  id: string;
  applicationNumber: string;
  status: string;
  productName?: string;
  amount?: string | number;
  timeline?: LoanApplication['timeline'];
};

export function ApplicationTracker({
  application,
  isLoading,
}: {
  application: TrackedApplication | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Panel title="Application progress" icon={Sparkles} className="lg:col-span-2">
        <Skeleton className="h-28" />
      </Panel>
    );
  }

  if (!application) {
    return (
      <Panel title="Application progress" icon={Sparkles} className="lg:col-span-2">
        <EmptyBlock
          icon={FileText}
          title="You haven't applied yet"
          description="Once you apply, you can follow every step here, from eligibility check to disbursement."
          action={<CtaLink href="/loans/apply">Apply for a loan</CtaLink>}
        />
      </Panel>
    );
  }

  const status = application.status;
  const terminalFailure = status === 'REJECTED' || status === 'CANCELLED';
  const closed = status === 'CLOSED';
  let currentIndex = WORKFLOW.findIndex((step) => step.status === status);
  let failedIndex = -1;

  if (terminalFailure) {
    const endEvent = [...(application.timeline || [])].reverse().find((event) => event.toState === status);
    const from = WORKFLOW.findIndex((step) => step.status === endEvent?.fromState);
    failedIndex = from >= 0 ? from : WORKFLOW.findIndex((step) => step.status === 'UNDER_REVIEW');
    currentIndex = failedIndex;
  }
  if (closed) currentIndex = WORKFLOW.length;

  const reason = terminalFailure
    ? [...(application.timeline || [])].reverse().find((event) => event.toState === status)?.reason
    : null;

  return (
    <Panel
      title="Application progress"
      description={[application.applicationNumber, application.productName].filter(Boolean).join(' · ')}
      icon={Sparkles}
      action={<TextLink href={`/loans/${application.id}`}>Details</TextLink>}
      className="lg:col-span-2"
    >
      <div
        className={cn(
          'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 sm:mb-6 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3',
          terminalFailure ? 'bg-red-50' : closed || status === 'ACTIVE' ? 'bg-emerald-50' : 'bg-secondary/60',
        )}
      >
        <div>
          <p className="text-xs font-semibold text-primary sm:text-sm">
            {STATUS_MESSAGES[status] || `Status: ${statusLabel(status)}`}
          </p>
          {reason ? <p className="mt-0.5 text-xs text-red-800 sm:text-sm">Reason: {reason}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {application.amount !== undefined ? (
            <span className="font-display text-base font-extrabold text-primary sm:text-lg">{formatInr(application.amount)}</span>
          ) : null}
          <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
        </div>
      </div>

      <ol className="grid gap-0 md:grid-cols-8 md:gap-1">
        {WORKFLOW.map((step, index) => {
          const state =
            index === failedIndex
              ? 'failed'
              : index < currentIndex || (closed && index <= WORKFLOW.length)
                ? 'done'
                : index === currentIndex && !terminalFailure
                  ? 'current'
                  : 'upcoming';
          const isLast = index === WORKFLOW.length - 1;
          return (
            <li key={step.status} className="relative flex gap-3 pb-3.5 sm:pb-5 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
              {!isLast ? (
                <span
                  className={cn(
                    'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-[calc(50%+18px)] md:top-[15px] md:h-0.5 md:w-[calc(100%-36px+0.25rem)]',
                    state === 'done' ? 'bg-emerald-400' : 'bg-border',
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold',
                  state === 'done' && 'border-emerald-500 bg-emerald-500 text-white',
                  state === 'current' && 'border-amber-400 bg-amber-50 text-amber-700 ring-4 ring-amber-100',
                  state === 'failed' && 'border-red-500 bg-red-500 text-white',
                  state === 'upcoming' && 'border-border bg-white text-muted-foreground',
                )}
              >
                {state === 'done' ? (
                  <Check className="size-4" aria-hidden />
                ) : state === 'failed' ? (
                  <X className="size-4" aria-hidden />
                ) : state === 'current' ? (
                  <CircleDashed className="size-4" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span className="pt-1 md:pt-0">
                <span
                  className={cn(
                    'block text-[13px] font-medium leading-tight sm:text-sm md:text-xs',
                    state === 'upcoming' ? 'text-muted-foreground' : 'text-primary',
                    state === 'failed' && 'text-red-700',
                  )}
                >
                  {state === 'failed' ? statusLabel(status) : step.label}
                </span>
                <span className="sr-only">
                  {state === 'done' ? 'completed' : state === 'current' ? 'in progress' : state === 'failed' ? 'stopped here' : 'not started'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading,
  isError,
}: {
  notifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
}) {
  const items = notifications.slice(0, 4);
  return (
    <Panel
      title="Notifications"
      icon={Bell}
      action={
        unreadCount > 0 ? (
          <span className="rounded-full bg-cta/15 px-2.5 py-1 text-xs font-bold text-orange-800">
            {unreadCount} unread
          </span>
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Notifications could not be loaded right now.</p>
      ) : items.length ? (
        <ul className="-mx-2 space-y-1">
          {items.map((item) => {
            const unread = !item.isRead && !item.readAt;
            return (
              <li key={item.id}>
                <Link
                  href="/notifications"
                  className={cn(
                    'flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/70',
                    unread && 'bg-secondary/40',
                  )}
                >
                  <span
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-emerald-500' : 'bg-transparent')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', unread ? 'font-semibold text-primary' : 'font-medium text-foreground')}>
                      {item.title || statusLabel(item.type)}
                      {unread ? <span className="sr-only"> (unread)</span> : null}
                    </span>
                    {item.body ? (
                      <span className="line-clamp-1 block text-xs text-muted-foreground">{item.body}</span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyBlock
          icon={BellOff}
          title="You're all caught up"
          description="KYC, loan and repayment updates will show up here."
        />
      )}
      <div className="mt-auto pt-4">
        <TextLink href="/notifications">All notifications</TextLink>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Repayment overview                                                  */
/* ------------------------------------------------------------------ */

export function RepaymentOverview({
  hasActiveLoan,
  schedule,
  isLoading,
  isError,
}: {
  hasActiveLoan: boolean;
  schedule?: CustomerRepaymentSchedule;
  isLoading: boolean;
  isError: boolean;
}) {
  if (!hasActiveLoan) {
    return (
      <Panel title="Repayment overview" icon={Wallet} className="lg:col-span-2">
        <EmptyBlock
          icon={Wallet}
          title="No active loan"
          description="Your installments, due dates and repayment progress will appear here after your loan is disbursed."
          action={<CtaLink href="/loans" variant="outline">View my loans</CtaLink>}
        />
      </Panel>
    );
  }

  if (isLoading) {
    return (
      <Panel title="Repayment overview" icon={Wallet} className="lg:col-span-2">
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      </Panel>
    );
  }

  if (isError || !schedule) {
    return (
      <Panel title="Repayment overview" icon={Wallet} className="lg:col-span-2">
        <p className="text-sm text-muted-foreground">The repayment schedule could not be loaded right now.</p>
        <div className="mt-auto pt-4">
          <TextLink href="/repayments">Open repayments</TextLink>
        </div>
      </Panel>
    );
  }

  const totalDue = Number(schedule.totals.totalDue) || 0;
  const paid = Number(schedule.totals.amountPaid) || 0;
  const progress = totalDue > 0 ? Math.min(100, Math.round((paid / totalDue) * 100)) : 0;
  const paidCount = schedule.installments.filter((item) => item.status === 'PAID').length;
  const upcoming = schedule.installments.filter((item) => item.status !== 'PAID').slice(0, 3);
  const next = schedule.nextPayment;
  const payable = next && ['DUE', 'OVERDUE', 'PARTIALLY_PAID'].includes(next.status);

  return (
    <Panel
      title="Repayment overview"
      description={`${schedule.applicationNumber} · ${paidCount} of ${schedule.installments.length} installments paid`}
      icon={Wallet}
      action={<TextLink href="/repayments">Schedule</TextLink>}
      className="lg:col-span-2"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total payable" value={formatInr(schedule.totals.totalDue)} />
        <Stat label="Paid so far" value={formatInr(schedule.totals.amountPaid)} tone="success" />
        <Stat label="Outstanding" value={formatInr(schedule.totals.outstanding)} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Repayment progress</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Repayment progress"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {upcoming.length ? (
        <ul className="mt-5 divide-y divide-border/70 rounded-2xl border border-border/80">
          {upcoming.map((item) => (
            <li key={item.installmentNumber} className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted font-display text-xs font-bold text-primary sm:size-9 sm:rounded-xl sm:text-sm">
                  {item.installmentNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-primary sm:text-sm">Installment {item.installmentNumber}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(item.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-right sm:gap-3">
                <span className="text-[13px] font-bold text-primary sm:text-sm">{formatInr(item.outstanding)}</span>
                <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          All installments are paid.
        </p>
      )}

      {payable ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent px-4 py-3">
          <p className="text-sm text-primary">
            Installment {next.installmentNumber} of <strong>{formatInr(next.outstanding)}</strong> is{' '}
            {next.status === 'OVERDUE' ? 'overdue' : 'due'}.
          </p>
          <CtaLink href="/repayments">Pay now</CtaLink>
        </div>
      ) : null}
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-display text-base font-extrabold sm:mt-1 sm:text-lg', tone === 'success' ? 'text-emerald-700' : 'text-primary')}>
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Referral                                                            */
/* ------------------------------------------------------------------ */

export function ReferralCard({ referral }: { referral: CustomerDashboard['referral'] }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!referral.code) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="portal-card portal-navy relative flex flex-col overflow-hidden border-transparent p-4 text-white sm:p-6">
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 size-56 rounded-full border border-emerald-300/30 shadow-[0_0_0_28px_rgba(110,231,183,.07),0_0_0_56px_rgba(110,231,183,.04)]"
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-white/15">
          <Gift className="size-[18px] text-emerald-300" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-[-0.02em] sm:text-lg">Referral program</h2>
          <p className="text-xs text-white/65 sm:text-sm">Invite friends with your personal code.</p>
        </div>
      </div>

      <div className="relative mt-4 sm:mt-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Your code</p>
        {referral.code ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 sm:rounded-2xl sm:px-4 sm:py-3">
            <span className="font-mono text-base font-bold tracking-wider sm:text-xl">{referral.code}</span>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              aria-label="Copy referral code"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/70">Your code will be generated on the referral page.</p>
        )}
      </div>

      <dl className="relative mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
        <div className="rounded-xl bg-white/10 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
          <dt className="text-xs text-white/65">Referred</dt>
          <dd className="mt-0.5 font-display text-xl font-extrabold sm:mt-1 sm:text-2xl">{referral.referredCount}</dd>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
          <dt className="text-xs text-white/65">Converted</dt>
          <dd className="mt-0.5 font-display text-xl font-extrabold text-emerald-300 sm:mt-1 sm:text-2xl">{referral.convertedCount}</dd>
        </div>
      </dl>
      {referral.referredBy ? (
        <p className="relative mt-3 text-xs text-white/65">Invited by {referral.referredBy}</p>
      ) : null}

      <div className="relative mt-auto pt-4 sm:pt-5">
        <Link
          href="/referral"
          className="inline-flex items-center gap-1 text-[13px] font-semibold sm:text-sm text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Open referral program <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent payments                                                     */
/* ------------------------------------------------------------------ */

export function RecentPayments({
  payments,
  hasActiveLoan,
}: {
  payments: CustomerDashboard['payments']['recent'];
  hasActiveLoan: boolean;
}) {
  return (
    <Panel
      title="Recent payments"
      description="Your latest transactions."
      icon={ReceiptIndianRupee}
      action={payments.length ? <TextLink href="/payments">View all</TextLink> : null}
      className="lg:col-span-3"
    >
      {payments.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 font-medium">Transaction</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-muted/50">
                    <td className="py-3 pr-4">
                      <PaymentLabel type={payment.type} method={payment.method} />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{payment.reference || '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(payment.createdAt)}</td>
                    <td className="py-3 pr-4 text-right font-bold text-primary">{formatInr(payment.amount)}</td>
                    <td className="py-3 text-right">
                      <Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border/70 md:hidden">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <PaymentLabel type={payment.type} method={payment.method} />
                  <p className="mt-1 pl-11 text-xs text-muted-foreground sm:pl-12">{formatDateTime(payment.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-primary sm:text-base">{formatInr(payment.amount)}</p>
                  <Badge tone={statusTone(payment.status)} className="mt-1">
                    {statusLabel(payment.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyBlock
          icon={ReceiptIndianRupee}
          title="No payments yet"
          description={
            hasActiveLoan
              ? 'Your repayments will be listed here once you make your first payment.'
              : 'Disbursements and repayments will be listed here once you have a loan.'
          }
          action={hasActiveLoan ? <CtaLink href="/repayments" variant="outline">Go to repayments</CtaLink> : undefined}
        />
      )}
    </Panel>
  );
}

function PaymentLabel({ type, method }: { type: string; method: string }) {
  const incoming = type === 'LOAN_DISBURSEMENT' || type === 'REFUND';
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 sm:rounded-xl',
          incoming ? 'bg-emerald-50 text-emerald-700' : 'bg-accent text-primary',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-primary sm:text-base">{statusLabel(type)}</p>
        <p className="text-xs text-muted-foreground">{method.replace(/_/g, ' ')}</p>
      </div>
    </div>
  );
}
