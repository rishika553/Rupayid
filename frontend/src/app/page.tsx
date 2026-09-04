import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10">
      <p className="text-sm font-semibold tracking-wide text-primary">RupayAid</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-tight">
        Personal loans with clear terms, not fine print.
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Check eligibility, complete KYC, and track every rupee — from disbursement to the last EMI.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/login">Continue with mobile</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">Customer dashboard</Link>
        </Button>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Transparent rates', body: 'See interest, fees, and tenure before you apply.' },
          { title: 'KYC that stays yours', body: 'Documents are stored as references, not in our database.' },
          { title: 'Repayment you can follow', body: 'Outstanding balance and next EMI in one place.' },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </main>
  );
}
