'use client';

import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReferral } from '@/hooks/use-customer-data';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/toaster';

export default function ReferralPage() {
  const { toast } = useToast();
  const query = useMyReferral();
  const data = query.data;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: label });
    } catch {
      toast({ title: label, description: text });
    }
  }

  if (query.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (query.error || !data) {
    return <ErrorState message="Unable to load your referral code." onRetry={() => void query.refetch()} />;
  }

  const shareUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/login?ref=${data.code || ''}`;

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="Share your unique code when someone opens a RupayAid account. Rewards are not enabled yet."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardDescription>Your code</CardDescription>
          <CardTitle className="font-mono tracking-wide">{data.code || '—'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            disabled={!data.code}
            onClick={() => data.code && void copy(data.code, 'Referral code copied')}
          >
            Copy code
          </Button>
          <Button
            variant="outline"
            disabled={!data.code}
            onClick={() => data.code && void copy(shareUrl, 'Invite link copied')}
          >
            Copy invite link
          </Button>
          <p className="w-full text-sm text-muted-foreground">
            Created {formatDate(data.codeCreatedAt)}
          </p>
        </CardContent>
      </Card>

      {data.referredBy ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">You joined with a referral</CardTitle>
            <CardDescription>
              {data.referredBy.firstName} {data.referredBy.lastName} · {formatDate(data.referredBy.acceptedAt)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People who used your code</CardTitle>
          <CardDescription>{data.referredCount} sign-up{data.referredCount === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.referred.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has used your code yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.referred.map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    {row.firstName} {row.lastName}
                  </span>
                  <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        <Link className="text-primary underline-offset-4 hover:underline" href="/dashboard">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
