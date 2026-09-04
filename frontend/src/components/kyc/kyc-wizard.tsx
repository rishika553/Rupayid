'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/feedback';
import { KycDocumentsPanel } from '@/components/kyc/kyc-documents-panel';
import { KycField, selectClassName } from '@/components/kyc/kyc-field';
import { KycProgress } from '@/components/kyc/kyc-progress';
import { useSubmitKyc, useUpdateKyc } from '@/hooks/use-customer-data';
import { formatDate } from '@/lib/format';
import {
  inferKycStep,
  isKycEditable,
  kycPathForStep,
  kycStatusLabel,
  latestDecisionReason,
  writeStoredKycStep,
} from '@/lib/kyc';
import { STEP_SCHEMAS, kycPatchBody, valuesFromKyc, type KycFormValues } from '@/lib/kyc-schema';
import type { KycApplication } from '@/lib/types';
import { useToast } from '@/components/ui/toaster';

const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const MARITAL = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const RESIDENCE = ['OWNED', 'RENTED', 'FAMILY', 'COMPANY_PROVIDED'];
const ID_TYPES = ['AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'];
const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT'];

function applyIssues(form: ReturnType<typeof useForm<KycFormValues>>, issues: Array<{ path: (string | number)[]; message: string }>) {
  for (const issue of issues) {
    const name = issue.path[0];
    if (typeof name === 'string') {
      form.setError(name as keyof KycFormValues, { type: 'manual', message: issue.message });
    }
  }
}

export function KycWizard({
  application,
  initialStep,
}: {
  application: KycApplication;
  initialStep?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const update = useUpdateKyc();
  const submit = useSubmitKyc();
  const editable = isKycEditable(application.status);
  const reason = latestDecisionReason(application);
  const [step, setStep] = useState(() => initialStep || inferKycStep(application));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const form = useForm<KycFormValues>({
    defaultValues: valuesFromKyc(application),
    mode: 'onTouched',
  });
  const includeBank = form.watch('includeBank');
  const values = form.watch();

  useEffect(() => {
    form.reset(valuesFromKyc(application));
  }, [application, form]);

  useEffect(() => {
    writeStoredKycStep(application.id, step);
    const path = kycPathForStep(step);
    if (pathname !== path) {
      router.replace(path);
    }
  }, [application.id, pathname, router, step]);

  const documents = application.documents || [];

  const reviewRows = useMemo(
    () => [
      ['Date of birth', formatDate(values.dateOfBirth)],
      ['Gender', values.gender],
      ['Father / spouse', values.fatherOrSpouseName],
      ['Marital status', values.maritalStatus],
      ['Address', [values.addressLine1, values.addressLine2, values.city, values.state, values.pincode].filter(Boolean).join(', ')],
      ['Residence', values.residenceType],
      ['ID type', values.idDocumentType],
      ['PAN last 4', values.panLastFour || '—'],
      ['Aadhaar last 4', values.aadhaarLastFour || '—'],
      [
        'Bank',
        values.includeBank
          ? `${values.accountHolderName}, ${values.bankName}, ****${values.accountLastFour}, ${values.ifsc}`
          : 'Not provided',
      ],
      ['Documents', String(documents.length)],
    ],
    [documents.length, values],
  );

  async function persistDraft() {
    const body = kycPatchBody(form.getValues());
    if (Object.keys(body).length === 0) {
      return;
    }
    await update.mutateAsync(body);
  }

  async function saveDraft(andLeave = false) {
    try {
      await persistDraft();
      toast({ title: 'Draft saved', description: 'You can resume this KYC later.' });
      if (andLeave) {
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Could not save draft',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  async function goNext() {
    form.clearErrors();
    if (step <= 4) {
      const parsed = STEP_SCHEMAS[step as 1 | 2 | 3 | 4].safeParse(form.getValues());
      if (!parsed.success) {
        applyIssues(form, parsed.error.issues);
        return;
      }
      try {
        await persistDraft();
      } catch (error) {
        toast({
          title: 'Could not save',
          description: error instanceof Error ? error.message : 'Try again',
          variant: 'destructive',
        });
        return;
      }
    }
    if (step === 5 && documents.length < 1) {
      toast({
        title: 'Add a document',
        description: 'Upload at least one identity document before continuing.',
        variant: 'destructive',
      });
      return;
    }
    setStep((current) => Math.min(7, current + 1));
  }

  async function onSubmit() {
    if (!confirmed) {
      toast({ title: 'Confirm the declaration', description: 'Tick the confirmation box first.', variant: 'destructive' });
      return;
    }
    try {
      await persistDraft();
      await submit.mutateAsync();
      setConfirmOpen(false);
      toast({ title: 'KYC submitted', description: 'We will notify you when review starts.' });
      router.push('/kyc/status');
    } catch (error) {
      setConfirmOpen(false);
      toast({
        title: 'Could not submit KYC',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (!editable) {
    return (
      <div>
        <PageHeader
          title="KYC"
          description="This application is locked while it is with our team."
          action={
            <Button asChild variant="outline">
              <Link href="/kyc/status">View status</Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{application.referenceCode || 'KYC application'}</CardTitle>
            <CardDescription>
              <Badge tone={statusTone(application.status)}>{kycStatusLabel(application.status)}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the status page to track review. You can edit again only if resubmission is required.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Complete KYC"
        description="Seven short steps. Save a draft any time and resume later."
        action={<Badge tone={statusTone(application.status)}>{kycStatusLabel(application.status)}</Badge>}
      />
      {application.status === 'RESUBMISSION_REQUIRED' && reason ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <p className="font-medium">Resubmission required</p>
          <p className="mt-1">{reason}</p>
        </div>
      ) : null}
      {application.status === 'REJECTED' && reason ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950" role="status">
          <p className="font-medium">Rejected</p>
          <p className="mt-1">{reason}</p>
        </div>
      ) : null}

      <KycProgress current={step} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {step === 1 && 'Personal information'}
            {step === 2 && 'Address'}
            {step === 3 && 'Identity information'}
            {step === 4 && 'Bank information'}
            {step === 5 && 'Document upload'}
            {step === 6 && 'Review'}
            {step === 7 && 'Submit'}
          </CardTitle>
          <CardDescription>
            {step === 4
              ? 'Needed if we will disburse to your bank account. You can skip this if not required yet.'
              : step === 5
                ? 'Files are sent to private storage with a signed URL. Public links are never stored.'
                : step === 7
                  ? 'Confirm the details, then submit for review.'
                  : 'Required fields must be completed before you continue. You can still save a partial draft.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 7) {
                void goNext();
                return;
              }
              if (!confirmed) {
                toast({
                  title: 'Confirm the declaration',
                  description: 'Tick the confirmation box first.',
                  variant: 'destructive',
                });
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <KycField label="Date of birth" htmlFor="dateOfBirth" error={form.formState.errors.dateOfBirth?.message}>
                  <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
                </KycField>
                <KycField label="Gender" htmlFor="gender" error={form.formState.errors.gender?.message}>
                  <select id="gender" className={selectClassName} {...form.register('gender')}>
                    <option value="">Select</option>
                    {GENDERS.map((item) => (
                      <option key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </KycField>
                <KycField
                  label="Father or spouse name"
                  htmlFor="fatherOrSpouseName"
                  error={form.formState.errors.fatherOrSpouseName?.message}
                >
                  <Input id="fatherOrSpouseName" {...form.register('fatherOrSpouseName')} />
                </KycField>
                <KycField label="Marital status" htmlFor="maritalStatus" error={form.formState.errors.maritalStatus?.message}>
                  <select id="maritalStatus" className={selectClassName} {...form.register('maritalStatus')}>
                    <option value="">Select</option>
                    {MARITAL.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </KycField>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <KycField
                  className="sm:col-span-2"
                  label="Address line 1"
                  htmlFor="addressLine1"
                  error={form.formState.errors.addressLine1?.message}
                >
                  <Input id="addressLine1" {...form.register('addressLine1')} />
                </KycField>
                <KycField className="sm:col-span-2" label="Address line 2" htmlFor="addressLine2">
                  <Input id="addressLine2" {...form.register('addressLine2')} />
                </KycField>
                <KycField label="City" htmlFor="city" error={form.formState.errors.city?.message}>
                  <Input id="city" {...form.register('city')} />
                </KycField>
                <KycField label="State" htmlFor="state" error={form.formState.errors.state?.message}>
                  <Input id="state" {...form.register('state')} />
                </KycField>
                <KycField label="Pincode" htmlFor="pincode" error={form.formState.errors.pincode?.message}>
                  <Input id="pincode" inputMode="numeric" maxLength={6} {...form.register('pincode')} />
                </KycField>
                <KycField label="Residence type" htmlFor="residenceType" error={form.formState.errors.residenceType?.message}>
                  <select id="residenceType" className={selectClassName} {...form.register('residenceType')}>
                    <option value="">Select</option>
                    {RESIDENCE.map((item) => (
                      <option key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </KycField>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <KycField
                  className="sm:col-span-2"
                  label="ID document type"
                  htmlFor="idDocumentType"
                  error={form.formState.errors.idDocumentType?.message}
                >
                  <select id="idDocumentType" className={selectClassName} {...form.register('idDocumentType')}>
                    <option value="">Select</option>
                    {ID_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </KycField>
                <KycField
                  label="PAN last 4"
                  htmlFor="panLastFour"
                  hint="Only the last four characters are stored."
                  error={form.formState.errors.panLastFour?.message}
                >
                  <Input id="panLastFour" maxLength={4} {...form.register('panLastFour')} />
                </KycField>
                <KycField
                  label="Aadhaar last 4"
                  htmlFor="aadhaarLastFour"
                  hint="Provide PAN or Aadhaar last 4."
                  error={form.formState.errors.aadhaarLastFour?.message}
                >
                  <Input id="aadhaarLastFour" inputMode="numeric" maxLength={4} {...form.register('aadhaarLastFour')} />
                </KycField>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <input type="checkbox" className="mt-1" {...form.register('includeBank')} />
                  <span>I will receive loan disbursement in a bank account, so bank details are required.</span>
                </label>
                {includeBank ? (
                  <>
                    <KycField
                      label="Account holder name"
                      htmlFor="accountHolderName"
                      error={form.formState.errors.accountHolderName?.message}
                    >
                      <Input id="accountHolderName" {...form.register('accountHolderName')} />
                    </KycField>
                    <KycField
                      label="Account last 4"
                      htmlFor="accountLastFour"
                      hint="Full account numbers are never stored."
                      error={form.formState.errors.accountLastFour?.message}
                    >
                      <Input id="accountLastFour" inputMode="numeric" maxLength={4} {...form.register('accountLastFour')} />
                    </KycField>
                    <KycField label="IFSC" htmlFor="ifsc" error={form.formState.errors.ifsc?.message}>
                      <Input id="ifsc" className="uppercase" {...form.register('ifsc')} />
                    </KycField>
                    <KycField label="Bank name" htmlFor="bankName" error={form.formState.errors.bankName?.message}>
                      <Input id="bankName" {...form.register('bankName')} />
                    </KycField>
                    <KycField label="Account type" htmlFor="accountType" error={form.formState.errors.accountType?.message}>
                      <select id="accountType" className={selectClassName} {...form.register('accountType')}>
                        <option value="">Select</option>
                        {ACCOUNT_TYPES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </KycField>
                  </>
                ) : (
                  <p className="sm:col-span-2 text-sm text-muted-foreground">
                    You can add bank details later if a loan is approved.
                  </p>
                )}
              </div>
            ) : null}

            {step === 5 ? <KycDocumentsPanel documents={documents} canEdit={editable} /> : null}

            {step === 6 ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {reviewRows.map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {step === 7 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Submitting sends this application for review. You will not be able to edit it unless an underwriter asks
                  for resubmission.
                </p>
                <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  <span>I confirm that the information and documents are true and belong to me.</span>
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))}>
                  Back
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => void saveDraft(false)} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save draft'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void saveDraft(true)} disabled={update.isPending}>
                Resume later
              </Button>
              <Button type="submit" disabled={update.isPending || submit.isPending}>
                {step === 7 ? 'Submit KYC' : 'Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="kyc-confirm-title">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Close confirmation" onClick={() => setConfirmOpen(false)} />
          <Card className="relative z-10 w-full max-w-md">
            <CardHeader>
              <CardTitle id="kyc-confirm-title" className="text-lg">
                Submit KYC for review?
              </CardTitle>
              <CardDescription>
                This cannot be undone until a reviewer returns it. Make sure your documents and last-four identity details
                are correct.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Go back
              </Button>
              <Button onClick={() => void onSubmit()} disabled={submit.isPending}>
                {submit.isPending ? 'Submitting…' : 'Yes, submit'}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export function KycStart({ onStart, pending }: { onStart: () => void; pending: boolean }) {
  return (
    <div>
      <PageHeader title="KYC" description="Verify your identity before a loan can be disbursed." />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Start verification</CardTitle>
          <CardDescription>
            A guided 7-step form. Save your draft and come back any time. Status: {kycStatusLabel('DRAFT')}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onStart} disabled={pending}>
            {pending ? 'Starting…' : 'Start KYC'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
