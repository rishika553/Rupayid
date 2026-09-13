import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';

export default function AdminKycQueuePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC review</CardTitle>
        <CardDescription>Applications submitted for staff review.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>The review queue will load from the KYC API in the next step.</p>
      </CardContent>
    </Card>
  );
}
