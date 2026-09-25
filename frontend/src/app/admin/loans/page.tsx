'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import { formatDateTime, formatInr, statusLabel } from '@/lib/format';

export default function AdminLoansPage() {
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'loans', 'list', status, submittedSearch],
    queryFn: () =>
      requireAdminApi(
        adminApiClient.loanList({
          limit: 50,
          status,
          search: submittedSearch || undefined,
        }),
      ),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" description="Approve or reject submitted loan applications." />
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
          <option value="REJECTED">Rejected</option>
          <option value="DISBURSED">Disbursed</option>
          <option value="ACTIVE">Active</option>
          <option value="ALL">All</option>
        </select>
        <Input
          placeholder="Name, mobile, or application number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {query.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {query.isError ? <ErrorState message="Unable to load loan applications." onRetry={() => void query.refetch()} /> : null}
      {query.data && query.data.data.length === 0 ? (
        <EmptyState title="No loan applications" description="Nothing matches this filter." />
      ) : null}
      {query.data && query.data.data.length > 0 ? (
        <div className="portal-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.customerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.applicationNumber}</td>
                  <td className="px-4 py-3">{row.productName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatInr(row.amountRequested)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.submittedAt || row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/loans/${row.id}`}>Review</Link>
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
