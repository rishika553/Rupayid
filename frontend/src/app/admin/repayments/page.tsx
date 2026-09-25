'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import { formatDate, formatDateTime, formatInr, statusLabel } from '@/lib/format';

export default function AdminRepaymentsPage() {
  const overdueQuery = useQuery({
    queryKey: ['admin', 'repayments', 'overdue'],
    queryFn: () => requireAdminApi(adminApiClient.repaymentsOverdue()),
  });
  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: () => requireAdminApi(adminApiClient.paymentsList()),
  });

  if (overdueQuery.isLoading || paymentsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (overdueQuery.isError || paymentsQuery.isError) {
    return (
      <ErrorState
        message="Unable to load repayments."
        onRetry={() => {
          void overdueQuery.refetch();
          void paymentsQuery.refetch();
        }}
      />
    );
  }

  const overdue = overdueQuery.data || [];
  const payments = paymentsQuery.data || [];

  return (
    <div className="space-y-8">
      <PageHeader title="Repayments" description="Overdue installments and recent customer payments." />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Overdue</h2>
        {overdue.length === 0 ? (
          <EmptyState title="No overdue installments" description="Schedules appear after a successful disbursement." />
        ) : (
          <div className="portal-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Application</th>
                  <th className="px-4 py-3 font-medium">EMI</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.customerName}</td>
                    <td className="px-4 py-3">
                      <Link className="underline-offset-4 hover:underline" href={`/admin/loans/${row.loanApplicationId}`}>
                        {row.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.sequence}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-3">{formatInr(row.totalAmount)}</td>
                    <td className="px-4 py-3">{formatInr(row.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recent payments</h2>
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Customer repayments will appear here after checkout." />
        ) : (
          <div className="portal-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Application</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.customerName}</td>
                    <td className="px-4 py-3">{row.applicationNumber || '—'}</td>
                    <td className="px-4 py-3">{formatInr(row.amount)}</td>
                    <td className="px-4 py-3">{row.method}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.capturedAt || row.createdAt)}</td>
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
