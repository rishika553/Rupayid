'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import { formatDateTime, formatInr, statusLabel } from '@/lib/format';

export default function AdminDisbursementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reference, setReference] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ['admin', 'disbursements'],
    queryFn: () => requireAdminApi(adminApiClient.disbursementList()),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, providerReference }: { id: string; status: string; providerReference?: string }) =>
      requireAdminApi(adminApiClient.disbursementStatus(id, status, providerReference)),
    onSuccess: async () => {
      toast({ title: 'Disbursement updated' });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) =>
      toast({
        title: 'Unable to update disbursement',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      }),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (query.isError) {
    return <ErrorState message="Unable to load disbursements." onRetry={() => void query.refetch()} />;
  }

  const rows = query.data || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Disbursements" description="Mark payouts as processing, sent, or failed." />
      {rows.length === 0 ? (
        <EmptyState
          title="No disbursements yet"
          description="Start a payout from an approved loan."
          actionHref="/admin/loans"
          actionLabel="Open loans"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link className="underline-offset-4 hover:underline" href={`/admin/loans/${row.loanApplicationId}`}>
                      {row.applicationNumber || row.loanApplicationId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatInr(row.amount)}</td>
                  <td className="px-4 py-3">{row.method}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    {['PENDING', 'PROCESSING'].includes(row.status) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="h-9 w-36 rounded-md border bg-background px-2 text-xs"
                          placeholder="Bank ref"
                          value={reference[row.id] || ''}
                          onChange={(event) => setReference((current) => ({ ...current, [row.id]: event.target.value }))}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: row.id, status: 'PROCESSING' })}
                        >
                          Processing
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: row.id,
                              status: 'SUCCESS',
                              providerReference: reference[row.id] || undefined,
                            })
                          }
                        >
                          Sent
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: row.id, status: 'FAILED' })}
                        >
                          Failed
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{row.providerReference || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
