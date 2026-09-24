'use client';

import { useMemo } from 'react';
import {
  ApplicationTracker,
  NotificationsPanel,
  RecentPayments,
  ReferralCard,
  RepaymentOverview,
  SummaryCards,
  WelcomeSection,
} from '@/components/dashboard/dashboard-widgets';
import { ErrorState } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCustomerDashboard,
  useLoanRepaymentSchedule,
  useMyLoans,
  useMyNotifications,
} from '@/hooks/use-customer-data';

export default function DashboardPage() {
  const query = useCustomerDashboard();
  const dashboard = query.data;
  const loans = useMyLoans();
  const notifications = useMyNotifications();
  const activeLoanId = dashboard?.loan.activeLoan?.id;
  const schedule = useLoanRepaymentSchedule(activeLoanId);

  const trackedApplication = useMemo(() => {
    if (!dashboard) return null;
    const current = dashboard.loan.currentApplication;
    const list = loans.data || [];
    if (current) {
      const full = list.find((loan) => loan.id === current.id);
      return {
        id: current.id,
        applicationNumber: current.applicationNumber,
        status: current.status,
        productName: current.productName,
        amount: current.requestedAmount,
        timeline: full?.timeline,
      };
    }
    const latest = list[0];
    if (!latest) return null;
    return {
      id: latest.id,
      applicationNumber: latest.applicationNumber,
      status: latest.status,
      productName: latest.loanProduct?.name,
      amount: latest.amountRequested,
      timeline: latest.timeline,
    };
  }, [dashboard, loans.data]);

  if (query.isLoading) {
    return <DashboardSkeleton />;
  }

  if (query.error || !dashboard) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Could not load dashboard'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const hasActiveLoan = Boolean(dashboard.loan.activeLoan);

  return (
    <div className="space-y-6">
      <WelcomeSection dashboard={dashboard} />

      <SummaryCards dashboard={dashboard} />

      <div className="grid gap-6 lg:grid-cols-3">
        <ApplicationTracker
          application={trackedApplication}
          isLoading={!dashboard.loan.currentApplication && loans.isLoading}
        />
        <NotificationsPanel
          notifications={notifications.data?.data || []}
          unreadCount={dashboard.notifications.unreadCount}
          isLoading={notifications.isLoading}
          isError={notifications.isError}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RepaymentOverview
          hasActiveLoan={hasActiveLoan}
          schedule={schedule.data}
          isLoading={schedule.isLoading}
          isError={schedule.isError}
        />
        <ReferralCard referral={dashboard.referral} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentPayments payments={dashboard.payments.recent} hasActiveLoan={hasActiveLoan} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-44 rounded-[1.25rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[196px] rounded-[1.25rem]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-[1.25rem] lg:col-span-2" />
        <Skeleton className="h-72 rounded-[1.25rem]" />
      </div>
    </div>
  );
}
