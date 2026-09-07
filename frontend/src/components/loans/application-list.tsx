import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { formatInr, statusLabel } from '@/lib/format';
import type { LoanApplication } from '@/lib/types';

export function ApplicationList({ applications }: { applications: LoanApplication[] }) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications"
        description="Choose a product and complete the application steps."
        actionHref="/loans/apply"
        actionLabel="Apply now"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {applications.map((loan) => (
        <li key={loan.id}>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">{loan.applicationNumber}</CardTitle>
                <CardDescription>
                  {loan.loanProduct?.name || 'Loan'} · {formatInr(loan.amountRequested)} · {loan.tenureMonths} months
                </CardDescription>
              </div>
              <Badge tone={statusTone(loan.status)}>{statusLabel(loan.status)}</Badge>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={`/loans/${loan.id}`}>Track application</Link>
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
