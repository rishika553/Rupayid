'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import type { AdminDashboardStats, AdminKycListItem, AdminLoanListItem } from '@/lib/admin-api-client';
import { formatDateTime, statusLabel } from '@/lib/format';

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
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
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
  const cards = [
    { label: 'KYC pending', value: stats.pendingReview },
    { label: 'Loans pending', value: stats.loans?.pendingReview ?? 0 },
    { label: 'Payouts pending', value: stats.disbursements?.pending ?? 0 },
    { label: 'Overdue EMIs', value: stats.overdueCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="KYC, loans, disbursements, and overdue repayments" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Loan applications to review</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/loans">View all</Link>
          </Button>
        </div>
        {recentLoans.length === 0 ? (
          <EmptyState title="No pending loans" description="Submitted loan applications will appear here." />
        ) : (
          <AdminTable
            headers={['Customer', 'Application', 'Amount', 'Status', '']}
            rows={recentLoans.map((row) => [
              row.customerName,
              row.applicationNumber,
              row.amountRequested,
              <Badge key={row.id} tone={statusTone(row.status)}>
                {statusLabel(row.status)}
              </Badge>,
              <Button key={`${row.id}-a`} asChild variant="outline" size="sm">
                <Link href={`/admin/loans/${row.id}`}>Review</Link>
              </Button>,
            ])}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Recent KYC</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/kyc">View all</Link>
          </Button>
        </div>
        {recentKyc.length === 0 ? (
          <EmptyState title="No submitted applications" description="Submitted KYC applications will appear here." />
        ) : (
          <AdminTable
            headers={['Customer', 'Mobile', 'Submitted', 'Status', '']}
            rows={recentKyc.map((row) => [
              row.customerName,
              row.mobile || '—',
              formatDateTime(row.submittedAt),
              <Badge key={row.id} tone={statusTone(row.status)}>
                {kycStatusLabel(row.status)}
              </Badge>,
              <Button key={`${row.id}-a`} asChild variant="outline" size="sm">
                <Link href={`/admin/kyc/${row.id}`}>View</Link>
              </Button>,
            ])}
          />
        )}
      </section>
    </div>
  );
}

function AdminTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header || 'action'} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-b last:border-0">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
