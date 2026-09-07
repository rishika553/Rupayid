import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { formatInr } from '@/lib/format';
import type { EligibilityResult } from '@/lib/types';

const COPY = {
  ELIGIBLE: {
    title: 'Eligible',
    tone: 'success' as const,
  },
  NOT_ELIGIBLE: {
    title: 'Not Eligible',
    tone: 'danger' as const,
  },
  ADDITIONAL_INFORMATION_REQUIRED: {
    title: 'Additional Information Required',
    tone: 'warning' as const,
  },
};

export function EligibilityResultCard({
  result,
  loading,
  error,
}: {
  result: EligibilityResult | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eligibility</CardTitle>
          <CardDescription>Checking this product against your profile…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eligibility</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eligibility</CardTitle>
          <CardDescription>Select a product to see the decision from RupayAid.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const copy = COPY[result.status];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Eligibility</CardTitle>
        <CardDescription>This result comes from the eligibility check. It is not calculated in your browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Badge tone={statusTone(copy.tone === 'success' ? 'APPROVED' : copy.tone === 'danger' ? 'REJECTED' : 'PENDING')}>
          {copy.title}
        </Badge>
        <p>{result.reason}</p>
        {result.eligible && result.eligibleAmount ? (
          <p>Eligible amount up to {formatInr(result.eligibleAmount)}</p>
        ) : null}
        {result.eligible && result.availableTenure?.length ? (
          <p>Available tenure {result.availableTenure.join(', ')} months</p>
        ) : null}
        {result.status === 'ADDITIONAL_INFORMATION_REQUIRED' ? (
          <p>
            <Link className="text-primary underline-offset-4 hover:underline" href="/profile">
              Update profile
            </Link>
            {' · '}
            <Link className="text-primary underline-offset-4 hover:underline" href="/kyc">
              Complete KYC
            </Link>
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">Reference {result.reference}</p>
      </CardContent>
    </Card>
  );
}
