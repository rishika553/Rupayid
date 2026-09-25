'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import { formatDateTime, statusLabel } from '@/lib/format';

function kycStatusLabel(status: string) {
  if (status === 'REJECTED') return 'Declined';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'Pending review';
  return statusLabel(status);
}

export default function AdminKycQueuePage() {
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'kyc', 'list', status, submittedSearch],
    queryFn: () =>
      requireAdminApi(
        adminApiClient.kycList({
          limit: 50,
          status: status === 'ALL' ? undefined : status,
          search: submittedSearch || undefined,
        }),
      ),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="KYC" description="Review submitted identity applications." />
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedSearch(search.trim());
        }}
      >
        <select
          className="h-10 rounded-xl border bg-card px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Declined</option>
          <option value="ALL">All</option>
        </select>
        <Input
          placeholder="Name or mobile"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {query.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {query.isError ? <ErrorState message="Unable to load KYC applications." onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? (
        <EmptyState title="No applications" description="Nothing matches this filter." />
      ) : null}
      {query.data && query.data.data.length > 0 ? (
        <div className="portal-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.customerName}</td>
                  <td className="px-4 py-3">{row.mobile || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.status)}>{kycStatusLabel(row.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/kyc/${row.id}`}>Review</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
