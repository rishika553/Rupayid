'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import { adminApiClient, requireAdminApi } from '@/lib/admin-api-client';
import type { AdminKycDetails } from '@/lib/admin-api-client';
import { formatDate, formatDateTime, statusLabel } from '@/lib/format';

const PENDING_STATUSES = ['SUBMITTED', 'UNDER_REVIEW'];

export default function AdminKycDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'kyc', id],
    enabled: Boolean(id),
    queryFn: () => requireAdminApi(adminApiClient.kycById(id)),
  });

  const approve = useMutation({
    mutationFn: () => requireAdminApi(adminApiClient.kycApprove(id)),
    onSuccess: async () => {
      setAcceptOpen(false);
      toast({ title: 'KYC accepted' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to accept KYC',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  const decline = useMutation({
    mutationFn: (reason: string) => requireAdminApi(adminApiClient.kycDecline(id, reason)),
    onSuccess: async () => {
      setDeclineOpen(false);
      setDeclineReason('');
      toast({ title: 'KYC declined' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to decline KYC',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  const busy = approve.isPending || decline.isPending;

  async function viewDocument(documentId: string) {
    setViewingId(documentId);
    try {
      const result = await requireAdminApi(adminApiClient.kycDocumentUrl(id, documentId));
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: 'Unable to open document',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setViewingId(null);
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        message="Unable to load this KYC application."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const app = query.data;
  const pending = PENDING_STATUSES.includes(app.status);
  const declined = app.status === 'REJECTED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC application"
        description={app.referenceCode || app.id}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/kyc">Back to KYC</Link>
          </Button>
        }
      />

      <Section title="Customer information">
        <FieldGrid>
          <Field label="Full name" value={app.customer.name} />
          <Field label="Mobile number" value={app.customer.mobile} />
          <Field label="Email" value={app.customer.email} />
          <Field label="Address" value={app.customer.address} wide />
        </FieldGrid>
      </Section>

      <Section title="KYC information">
        <KycDetailsBlock details={app.details} />
      </Section>

      <Section title="Documents">
        {app.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents were submitted.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Document type</th>
                  <th className="py-2 pr-4 font-medium">Document name</th>
                  <th className="py-2 pr-4 font-medium">Upload date</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {app.documents.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{humanize(doc.documentType)}</td>
                    <td className="py-3 pr-4">{doc.fileName}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(doc.uploadedAt)}</td>
                    <td className="py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={viewingId === doc.id}
                        onClick={() => void viewDocument(doc.id)}
                      >
                        {viewingId === doc.id ? 'Opening…' : 'View Document'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Application status">
        <FieldGrid>
          <div>
            <p className="text-xs text-muted-foreground">Current status</p>
            <div className="mt-1">
              <Badge tone={kycTone(app.status)}>{kycStatusLabel(app.status)}</Badge>
            </div>
          </div>
          <Field label="Submitted date" value={formatDateTime(app.submittedAt)} />
          <Field label="Reviewed date" value={app.reviewedAt ? formatDateTime(app.reviewedAt) : '—'} />
          <Field label="Reviewer" value={app.reviewer} />
          {declined ? <Field label="Decline reason" value={app.declineReason} wide /> : null}
        </FieldGrid>
      </Section>

      {pending ? (
        <Section title="Actions">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Dialog.Root open={acceptOpen} onOpenChange={setAcceptOpen}>
              <Dialog.Trigger asChild>
                <Button type="button" disabled={busy}>
                  Accept Application
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg">
                  <Dialog.Title className="text-lg font-semibold">Accept application</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                    Are you sure you want to accept this KYC application?
                  </Dialog.Description>
                  <div className="mt-6 flex justify-end gap-2">
                    <Dialog.Close asChild>
                      <Button type="button" variant="outline" disabled={approve.isPending}>
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button type="button" disabled={approve.isPending} onClick={() => approve.mutate()}>
                      {approve.isPending ? 'Accepting…' : 'Accept'}
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root
              open={declineOpen}
              onOpenChange={(open) => {
                setDeclineOpen(open);
                if (!open) setDeclineReason('');
              }}
            >
              <Dialog.Trigger asChild>
                <Button type="button" variant="destructive" disabled={busy}>
                  Decline Application
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg">
                  <Dialog.Title className="text-lg font-semibold">Decline application</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                    Provide a reason. This is saved with the KYC review.
                  </Dialog.Description>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="decline-reason">Decline reason</Label>
                    <textarea
                      id="decline-reason"
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                      rows={4}
                      className={cn(
                        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    />
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Dialog.Close asChild>
                      <Button type="button" variant="outline" disabled={decline.isPending}>
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={decline.isPending || declineReason.trim().length < 3}
                      onClick={() => decline.mutate(declineReason.trim())}
                    >
                      {decline.isPending ? 'Declining…' : 'Decline'}
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value?.trim() ? value : '—'}</p>
    </div>
  );
}

function KycDetailsBlock({ details }: { details: AdminKycDetails | null }) {
  if (!details) {
    return <p className="text-sm text-muted-foreground">No KYC details were submitted.</p>;
  }
  const rows: Array<{ label: string; value?: string | null }> = [
    { label: 'Date of birth', value: details.dateOfBirth ? formatDate(details.dateOfBirth) : null },
    { label: 'Gender', value: details.gender },
    { label: 'Father / spouse name', value: details.fatherOrSpouseName },
    { label: 'Marital status', value: details.maritalStatus },
    { label: 'Nationality', value: details.nationality },
    { label: 'Residence type', value: details.residenceType },
    { label: 'ID document type', value: details.idDocumentType ? humanize(details.idDocumentType) : null },
    { label: 'PAN last four', value: details.panLastFour },
    { label: 'Aadhaar last four', value: details.aadhaarLastFour },
    { label: 'Account holder', value: details.accountHolderName },
    { label: 'Account last four', value: details.accountLastFour },
    { label: 'IFSC', value: details.ifsc },
    { label: 'Bank name', value: details.bankName },
    { label: 'Account type', value: details.accountType },
  ];
  return (
    <FieldGrid>
      {rows.map((row) => (
        <Field key={row.label} label={row.label} value={row.value} />
      ))}
    </FieldGrid>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function kycStatusLabel(status: string) {
  if (status === 'REJECTED') return 'Declined';
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') return 'Pending review';
  return statusLabel(status);
}

function kycTone(status: string) {
  if (status === 'REJECTED') return 'danger' as const;
  return statusTone(status);
}
