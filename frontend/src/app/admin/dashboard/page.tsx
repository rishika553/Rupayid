'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import type { AdminKycListItem, AdminKycStats } from '@/lib/admin-api-client';
import { formatDateTime, statusLabel } from '@/lib/format';

function kycStatusLabel(status: string) {
  if (status === 'REJECTED') {
    return 'Declined';
  }
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return 'Pending review';
  }
  return statusLabel(status);
}

function kycStatusTone(status: string) {
  if (status === 'REJECTED') {
    return 'danger' as const;
  }
  return statusTone(status);
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'kyc', 'stats'],
    queryFn: () => requireAdminApi(adminApiClient.kycStats()),
    staleTime: 15_000,
  });
  const recentQuery = useQuery({
    queryKey: ['admin', 'kyc', 'recent'],
    queryFn: () => requireAdminApi(adminApiClient.kycList({ limit: 8 })),
    staleTime: 15_000,
  });

  if (statsQuery.isLoading || recentQuery.isLoading) {
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

  if (statsQuery.isError || recentQuery.isError || !statsQuery.data || !recentQuery.data) {
    return (
      <ErrorState
        message="Unable to load KYC dashboard."
        onRetry={() => {
          void statsQuery.refetch();
          void recentQuery.refetch();
        }}
      />
    );
  }

  return <DashboardBody stats={statsQuery.data} recent={recentQuery.data.data} />;
}

function DashboardBody({ stats, recent }: { stats: AdminKycStats; recent: AdminKycListItem[] }) {
  const cards = [
    { label: 'Total KYC Applications', value: stats.total },
    { label: 'Pending Review', value: stats.pendingReview },
    { label: 'Approved', value: stats.approved },
    { label: 'Declined', value: stats.declined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Phase 1 KYC review"
        action={
          <Button asChild>
            <Link href="/admin/kyc">View All KYC Applications</Link>
          </Button>
        }
      />

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
        <h2 className="text-lg font-semibold tracking-tight">Recent KYC Applications</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No submitted applications"
            description="Submitted KYC applications will appear here for review."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer Name</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Submitted At</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{row.customerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.mobile || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={kycStatusTone(row.status)}>{kycStatusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/kyc/${row.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
