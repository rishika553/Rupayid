'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import type { AdminReferral } from '@/lib/admin-api-client';
import { formatDateTime } from '@/lib/format';

const STATUSES = ['PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED'];

export default function AdminReferralsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', 'referrals', status, submittedSearch, page],
    queryFn: () => requireAdminApi(adminApiClient.referralList({ page, status, search: submittedSearch })),
  });
  return <div className="space-y-6">
    <PageHeader title="Referral Management" description="Review customer-submitted referrals and record follow-up outcomes." />
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={event => {
      event.preventDefault(); setSubmittedSearch(search.trim()); setPage(1);
    }}>
      <select aria-label="Filter by status" className="h-10 rounded-xl border bg-card px-3 text-sm" value={status}
        onChange={event => { setStatus(event.target.value); setPage(1); }}>
        <option value="">All statuses</option>{STATUSES.map(value => <option key={value}>{value}</option>)}
      </select>
      <Input aria-label="Search referrals" placeholder="Referred person's name or mobile number" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} />
      <Button type="submit" variant="outline">Search</Button>
    </form>
    <p className="text-sm text-muted-foreground">Consent is attested by the referring customer. Confirm the person is willing to continue when contacting them; record REJECTED if they decline. No automated calls or messages are sent.</p>
    {query.isLoading && <Skeleton className="h-64 w-full" />}
    {query.isError && <ErrorState message="Unable to load referrals." onRetry={() => void query.refetch()} />}
    {query.data?.data.length === 0 && <EmptyState title="No referrals" description="No referrals match your search." />}
    {!!query.data?.data.length && <div className="portal-card overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="border-b bg-muted/50"><tr>{['Referred person', 'Referring customer', 'Submitted', 'Consent attestation', 'Status', 'Update status'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody>{query.data.data.map(row => <ReferralRow key={`${row.id}-${row.status}`} row={row} />)}</tbody>
      </table>
    </div>}
    {query.data && <div className="flex items-center justify-between gap-3">
      <Button variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="text-sm">{query.data.total} referrals · Page {page} of {Math.max(1, query.data.totalPages)}</span>
      <Button variant="outline" disabled={page >= query.data.totalPages || query.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
    </div>}
  </div>;
}

function ReferralRow({ row }: { row: AdminReferral }) {
  const [status, setStatus] = useState(row.status);
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => requireAdminApi(adminApiClient.updateReferralStatus(row.id, status)),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['admin', 'referrals'] }),
  });
  return <tr className="border-b align-top last:border-0">
    <td className="px-4 py-3"><p className="font-medium">{row.referredName}</p><p>{row.referredPhone}</p></td>
    <td className="px-4 py-3"><p>{row.referrer.firstName} {row.referrer.lastName}</p><p className="text-xs text-muted-foreground">{row.referrer.email}</p><p className="text-xs">{row.code}</p></td>
    <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
    <td className="px-4 py-3"><p>{formatDateTime(row.consentAttestedAt)}</p><p className="text-xs text-muted-foreground">{row.consentVersion}</p></td>
    <td className="px-4 py-3"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
    <td className="space-y-2 px-4 py-3">
      <select aria-label={`Status for ${row.referredName}`} className="h-9 rounded-lg border bg-card px-2" disabled={mutation.isPending} value={status} onChange={event => setStatus(event.target.value)}>
        {STATUSES.map(value => <option key={value}>{value}</option>)}
      </select>
      <Button className="ml-2" size="sm" disabled={mutation.isPending || status === row.status} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save'}</Button>
      {mutation.isError && <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>}
    </td>
  </tr>;
}
