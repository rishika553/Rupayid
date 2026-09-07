'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReferral, useValidateReferral } from '@/hooks/use-customer-data';
import { formatDate, statusLabel } from '@/lib/format';
import { useToast } from '@/components/ui/toaster';

const validateSchema = z.object({
  code: z.string().regex(/^RAP-[A-Za-z0-9]{8}$/i, 'Use a code like RAP-ABCD2345'),
});

function validateMessage(reason?: string) {
  if (reason === 'self') {
    return 'You cannot use your own referral code.';
  }
  if (reason === 'limit') {
    return 'This code cannot accept more referrals.';
  }
  if (reason === 'invalid_format') {
    return 'Enter a code like RAP-ABCD2345.';
  }
  return 'That referral code is not valid.';
}

export default function ReferralPage() {
  const { toast } = useToast();
  const query = useMyReferral();
  const validate = useValidateReferral();
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const form = useForm<z.infer<typeof validateSchema>>({
    resolver: zodResolver(validateSchema),
    defaultValues: { code: '' },
  });
  const data = query.data;
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const invitePath = data?.invitePath || (data?.code ? `/login?ref=${data.code}` : '');
  const shareUrl = origin && invitePath ? `${origin}${invitePath}` : invitePath;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: label });
    } catch {
      toast({ title: label, description: text });
    }
  }

  async function share() {
    if (!data?.code) {
      return;
    }
    const text = `Use my RupayAid referral code ${data.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'RupayAid referral', text, url: shareUrl });
        return;
      } catch {
        // User cancelled or share is unavailable; fall back to copy.
      }
    }
    await copy(`${text}\n${shareUrl}`, 'Referral details copied');
  }

  async function onValidate(values: z.infer<typeof validateSchema>) {
    setCheckResult(null);
    try {
      const result = await validate.mutateAsync(values.code.trim().toUpperCase());
      setCheckResult(result.valid ? 'This referral code is valid.' : validateMessage(result.reason));
    } catch (error) {
      setCheckResult(error instanceof Error ? error.message : 'Could not check that code');
    }
  }

  if (query.isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (query.error || !data) {
    return <ErrorState message="Unable to load your referral code." onRetry={() => void query.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="Share your unique code when someone opens a RupayAid account."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardDescription>Your code</CardDescription>
          <CardTitle className="font-mono tracking-wide">{data.code || '—'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Referral link</p>
            <p className="mt-1 break-all font-mono text-sm">{data.code ? shareUrl : '—'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!data.code} onClick={() => data.code && void copy(data.code, 'Referral code copied')}>
              Copy code
            </Button>
            <Button
              variant="outline"
              disabled={!data.code}
              onClick={() => data.code && void copy(shareUrl, 'Invite link copied')}
            >
              Copy invite link
            </Button>
            <Button variant="outline" disabled={!data.code} onClick={() => void share()}>
              Share
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Created {formatDate(data.codeCreatedAt)}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Check a referral code</CardTitle>
          <CardDescription>Confirm a code before someone uses it at sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={form.handleSubmit(onValidate)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="checkCode">Code</Label>
              <Input id="checkCode" className="uppercase" placeholder="RAP-ABCD2345" {...form.register('code')} />
              {form.formState.errors.code ? (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" disabled={validate.isPending}>
                {validate.isPending ? 'Checking…' : 'Validate'}
              </Button>
            </div>
          </form>
          {checkResult ? <p className="mt-3 text-sm">{checkResult}</p> : null}
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
          <CardContent>
            <Badge tone={statusTone(data.referredBy.status)}>{statusLabel(data.referredBy.status)}</Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referral history</CardTitle>
          <CardDescription>
            {data.referredCount} sign-up{data.referredCount === 1 ? '' : 's'} with your code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.referred.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has used your code yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.referred.map((row) => (
                <li
                  key={`${row.createdAt}-${row.firstName}-${row.lastName}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <span>
                    {row.firstName} {row.lastName}
                    <span className="mt-1 block text-muted-foreground">{formatDate(row.createdAt)}</span>
                  </span>
                  <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
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
