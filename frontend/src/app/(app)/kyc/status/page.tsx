'use client';

import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useKycStatus, useMyKyc } from '@/hooks/use-customer-data';
import { formatDate } from '@/lib/format';
import { isKycEditable, kycStatusLabel, latestDecisionReason } from '@/lib/kyc';

const OUTCOMES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'RESUBMISSION_REQUIRED',
] as const;

export default function KycStatusPage() {
  const query = useMyKyc();
  const statusQuery = useKycStatus();
  const current = query.data?.[0];
  const status = statusQuery.data;
  const displayStatus = status?.status || current?.status;
  const reason = status?.reason || latestDecisionReason(current);
  const rejected = displayStatus === 'REJECTED' || displayStatus === 'DECLINED';
  const resubmit = displayStatus === 'RESUBMISSION_REQUIRED';

  if (query.isLoading || statusQuery.isLoading) {
    return <Skeleton className="h-40" />;
  }
  if (query.error || statusQuery.error) {
    return (
      <ErrorState
        message="Unable to load KYC status."
        onRetry={() => {
          void query.refetch();
          void statusQuery.refetch();
        }}
      />
    );
  }
  if (!status?.exists || !current) {
    return (
      <EmptyState
        title="No KYC application"
        description="Start KYC to verify your identity."
        actionHref="/kyc"
        actionLabel="Go to KYC"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="KYC status"
        description="Track your verification: Draft, Pending, Approved, Declined, or Resubmission Required."
        action={
          isKycEditable(displayStatus) ? (
            <Button asChild>
              <Link href="/kyc">Continue KYC</Link>
            </Button>
          ) : null
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{status.referenceCode || current.referenceCode || 'KYC application'}</CardTitle>
          <CardDescription>
            <Badge tone={statusTone(displayStatus)}>{kycStatusLabel(displayStatus)}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Mobile: {current.contact?.phoneNumber || '—'}</p>
          <p>Documents: {status.documentCount}</p>
          <p>Submitted: {formatDate(status.submittedAt)}</p>
          <p>Reviewed: {formatDate(status.reviewedAt)}</p>
          {rejected || resubmit ? (
            <div
              className={
                rejected
                  ? 'rounded-lg border border-red-200 bg-red-50 p-3 text-red-950'
                  : 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950'
              }
              role="status"
            >
              <p className="font-medium">{rejected ? 'Declined' : 'Resubmission required'}</p>
              <p className="mt-1">{reason || 'No reason was provided. Contact support if you need help.'}</p>
            </div>
          ) : null}
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((item) => {
              const currentItem = displayStatus === item;
              return (
                <li
                  key={item}
                  className={`rounded-lg border p-3 ${currentItem ? 'border-primary/40 bg-secondary/60' : 'text-muted-foreground'}`}
                >
                  <p className="font-medium text-foreground">{kycStatusLabel(item)}</p>
                  {currentItem ? <p className="mt-1 text-xs">Current status</p> : null}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification history</CardTitle>
        </CardHeader>
        <CardContent>
          {(current.verificationHistory || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewer decisions yet.</p>
          ) : (
            <ul className="space-y-3">
              {(current.verificationHistory || []).map((item) => (
                <li key={item.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{kycStatusLabel(item.decision)}</p>
                  <p className="text-muted-foreground">{item.reason || 'No reason recorded'}</p>
                  <p className="text-muted-foreground">{formatDate(item.reviewedAt || item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
