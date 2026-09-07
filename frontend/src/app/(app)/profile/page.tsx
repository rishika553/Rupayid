'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/ui/feedback';
import { KycField, selectClassName } from '@/components/kyc/kyc-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toaster';
import { useAuth } from '@/components/providers/auth-provider';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/hooks/use-customer-data';
import { formatDate, statusLabel } from '@/lib/format';
import { kycStatusLabel } from '@/lib/kyc';
import type { CustomerProfile } from '@/lib/types';

const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const MARITAL = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const;
const RESIDENCE = ['OWNED', 'RENTED', 'FAMILY', 'COMPANY_PROVIDED'] as const;
const ID_TYPES = ['AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'] as const;
const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(''));

const schema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(80),
  lastName: z.string().trim().min(1, 'Required').max(80),
  middleName: optionalText(80),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => {
      if (!value) {
        return true;
      }
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      return date <= cutoff;
    }, 'You must be at least 18 years old'),
  gender: optionalText(32),
  fatherOrSpouseName: optionalText(120),
  maritalStatus: optionalText(32),
  occupation: optionalText(80),
  email: z.string().email('Enter a valid email').max(160).optional().or(z.literal('')),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  city: optionalText(80),
  state: optionalText(80),
  pincode: z.string().regex(/^\d{6}$|^$/, 'Pincode must be 6 digits'),
  residenceType: optionalText(40),
  yearlyIncome: z.string().regex(/^\d{0,10}(\.\d{1,2})?$/, 'Enter a valid amount'),
  panLastFour: z.string().regex(/^[A-Za-z0-9]{4}$|^$/, 'Enter the last 4 of PAN'),
  aadhaarLastFour: z.string().regex(/^\d{4}$|^$/, 'Enter the last 4 of Aadhaar'),
  idDocumentType: optionalText(40),
  accountHolderName: optionalText(120),
  accountLastFour: z.string().regex(/^\d{4}$|^$/, 'Enter the last 4 of the account'),
  ifsc: z.string().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$|^$/, 'Enter a valid IFSC'),
  accountType: optionalText(32),
  bankName: optionalText(80),
});

type FormValues = z.infer<typeof schema>;

function empty(value?: string | null) {
  return value || '';
}

function valuesFromProfile(profile: CustomerProfile): FormValues {
  return {
    firstName: profile.personal.firstName,
    lastName: profile.personal.lastName,
    middleName: empty(profile.personal.middleName),
    dateOfBirth: empty(profile.personal.dateOfBirth).slice(0, 10),
    gender: empty(profile.personal.gender),
    fatherOrSpouseName: empty(profile.personal.fatherOrSpouseName),
    maritalStatus: empty(profile.personal.maritalStatus),
    occupation: empty(profile.personal.occupation),
    email: empty(profile.contact.email),
    addressLine1: empty(profile.address.addressLine1),
    addressLine2: empty(profile.address.addressLine2),
    city: empty(profile.address.city),
    state: empty(profile.address.state),
    pincode: empty(profile.address.pincode),
    residenceType: empty(profile.address.residenceType),
    yearlyIncome: empty(profile.account.yearlyIncome).replace(/\.00$/, ''),
    panLastFour: empty(profile.account.panLastFour),
    aadhaarLastFour: empty(profile.account.aadhaarLastFour),
    idDocumentType: empty(profile.account.idDocumentType),
    accountHolderName: empty(profile.account.accountHolderName),
    accountLastFour: empty(profile.account.accountLastFour),
    ifsc: empty(profile.account.ifsc),
    bankName: empty(profile.account.bankName),
    accountType: empty(profile.account.accountType),
  };
}

function payloadFromValues(values: FormValues): Record<string, string | undefined> {
  const body: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed) {
      body[key] = key === 'ifsc' || key === 'panLastFour' ? trimmed.toUpperCase() : trimmed;
    }
  }
  return body;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16" />
      <Skeleton className="h-48" />
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
    </div>
  );
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const query = useCustomerProfile();
  const update = useUpdateCustomerProfile();
  const profile = query.data;
  const locked = Boolean(profile?.account.identityLocked);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      gender: '',
      fatherOrSpouseName: '',
      maritalStatus: '',
      occupation: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      residenceType: '',
      yearlyIncome: '',
      panLastFour: '',
      aadhaarLastFour: '',
      idDocumentType: '',
      accountHolderName: '',
      accountLastFour: '',
      ifsc: '',
      bankName: '',
      accountType: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset(valuesFromProfile(profile));
    }
  }, [profile, form]);

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync(payloadFromValues(values));
      await refreshUser();
      toast({ title: 'Profile saved', description: 'Your details are now stored on your RupayAid account.' });
    } catch (error) {
      toast({
        title: 'Could not save profile',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  if (query.isLoading) {
    return <ProfileSkeleton />;
  }
  if (query.error || !profile) {
    return (
      <ErrorState
        message="Unable to load your profile from the server."
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Keep the same details you use for KYC and loan applications."
      />

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal information</CardTitle>
            <CardDescription>Name and background used during onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <KycField label="First name" htmlFor="firstName" error={form.formState.errors.firstName?.message}>
              <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
            </KycField>
            <KycField label="Last name" htmlFor="lastName" error={form.formState.errors.lastName?.message}>
              <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
            </KycField>
            <KycField label="Middle name" htmlFor="middleName">
              <Input id="middleName" {...form.register('middleName')} />
            </KycField>
            <KycField label="Date of birth" htmlFor="dateOfBirth" error={form.formState.errors.dateOfBirth?.message}>
              <Input id="dateOfBirth" type="date" disabled={locked} {...form.register('dateOfBirth')} />
            </KycField>
            <KycField label="Gender" htmlFor="gender">
              <select id="gender" className={selectClassName} {...form.register('gender')}>
                <option value="">Select</option>
                {GENDERS.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </KycField>
            <KycField label="Marital status" htmlFor="maritalStatus">
              <select id="maritalStatus" className={selectClassName} {...form.register('maritalStatus')}>
                <option value="">Select</option>
                {MARITAL.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </KycField>
            <KycField label="Father or spouse name" htmlFor="fatherOrSpouseName" className="sm:col-span-2">
              <Input id="fatherOrSpouseName" {...form.register('fatherOrSpouseName')} />
            </KycField>
            <KycField label="Occupation" htmlFor="occupation">
              <Input id="occupation" {...form.register('occupation')} />
            </KycField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact information</CardTitle>
            <CardDescription>Mobile is verified by OTP and cannot be changed here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <KycField label="Mobile" htmlFor="phone" hint={profile.contact.phoneVerified ? 'Verified' : 'Not verified'}>
              <Input id="phone" value={profile.contact.phoneNumber || ''} readOnly />
            </KycField>
            <KycField label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            </KycField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address</CardTitle>
            <CardDescription>Current residential address for KYC and correspondence.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <KycField label="Address line 1" htmlFor="addressLine1" className="sm:col-span-2">
              <Input id="addressLine1" autoComplete="address-line1" {...form.register('addressLine1')} />
            </KycField>
            <KycField label="Address line 2" htmlFor="addressLine2" className="sm:col-span-2">
              <Input id="addressLine2" autoComplete="address-line2" {...form.register('addressLine2')} />
            </KycField>
            <KycField label="City" htmlFor="city">
              <Input id="city" autoComplete="address-level2" {...form.register('city')} />
            </KycField>
            <KycField label="State" htmlFor="state">
              <Input id="state" autoComplete="address-level1" {...form.register('state')} />
            </KycField>
            <KycField label="Pincode" htmlFor="pincode" error={form.formState.errors.pincode?.message}>
              <Input id="pincode" inputMode="numeric" autoComplete="postal-code" {...form.register('pincode')} />
            </KycField>
            <KycField label="Residence type" htmlFor="residenceType">
              <select id="residenceType" className={selectClassName} {...form.register('residenceType')}>
                <option value="">Select</option>
                {RESIDENCE.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </KycField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account information</CardTitle>
            <CardDescription>
              {locked
                ? 'Identity and bank last-four are locked while KYC is under review or approved.'
                : 'Only last-four identity and account digits are stored. Never enter a full PAN, Aadhaar, or account number.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <KycField label="Account status" htmlFor="accountStatus">
              <Input id="accountStatus" value={statusLabel(profile.account.status)} readOnly />
            </KycField>
            <KycField label="Referral code" htmlFor="referralCode">
              <Input id="referralCode" value={profile.account.referralCode || '—'} readOnly />
            </KycField>
            <KycField label="Member since" htmlFor="memberSince">
              <Input id="memberSince" value={formatDate(profile.account.memberSince)} readOnly />
            </KycField>
            <KycField label="Yearly income (₹)" htmlFor="yearlyIncome" error={form.formState.errors.yearlyIncome?.message}>
              <Input id="yearlyIncome" inputMode="decimal" {...form.register('yearlyIncome')} />
            </KycField>
            <KycField label="PAN last 4" htmlFor="panLastFour" error={form.formState.errors.panLastFour?.message}>
              <Input id="panLastFour" maxLength={4} disabled={locked} {...form.register('panLastFour')} />
            </KycField>
            <KycField label="Aadhaar last 4" htmlFor="aadhaarLastFour" error={form.formState.errors.aadhaarLastFour?.message}>
              <Input id="aadhaarLastFour" inputMode="numeric" maxLength={4} disabled={locked} {...form.register('aadhaarLastFour')} />
            </KycField>
            <KycField label="ID document" htmlFor="idDocumentType">
              <select id="idDocumentType" className={selectClassName} disabled={locked} {...form.register('idDocumentType')}>
                <option value="">Select</option>
                {ID_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </KycField>
            <KycField label="Account holder" htmlFor="accountHolderName">
              <Input id="accountHolderName" disabled={locked} {...form.register('accountHolderName')} />
            </KycField>
            <KycField label="Account last 4" htmlFor="accountLastFour" error={form.formState.errors.accountLastFour?.message}>
              <Input id="accountLastFour" inputMode="numeric" maxLength={4} disabled={locked} {...form.register('accountLastFour')} />
            </KycField>
            <KycField label="IFSC" htmlFor="ifsc" error={form.formState.errors.ifsc?.message}>
              <Input id="ifsc" disabled={locked} {...form.register('ifsc')} />
            </KycField>
            <KycField label="Bank name" htmlFor="bankName">
              <Input id="bankName" disabled={locked} {...form.register('bankName')} />
            </KycField>
            <KycField label="Account type" htmlFor="accountType">
              <select id="accountType" className={selectClassName} disabled={locked} {...form.register('accountType')}>
                <option value="">Select</option>
                {ACCOUNT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </KycField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KYC status</CardTitle>
            <CardDescription>Live status from your KYC application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(profile.kyc.status)}>{kycStatusLabel(profile.kyc.status)}</Badge>
              {profile.kyc.completed ? <Badge tone="success">KYC complete</Badge> : null}
            </div>
            {profile.kyc.referenceCode ? <p>Reference: {profile.kyc.referenceCode}</p> : null}
            <p>Submitted: {formatDate(profile.kyc.submittedAt)}</p>
            <p>Reviewed: {formatDate(profile.kyc.reviewedAt)}</p>
            {profile.kyc.reason && ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(profile.kyc.status) ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950" role="status">
                {profile.kyc.reason}
              </p>
            ) : null}
            <Button asChild variant="outline">
              <Link href={profile.kyc.canEdit ? '/kyc' : '/kyc/status'}>
                {profile.kyc.status === 'NOT_STARTED' ? 'Start KYC' : profile.kyc.canEdit ? 'Continue KYC' : 'View KYC status'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="sticky bottom-20 z-10 rounded-lg border bg-card p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 lg:bottom-auto">
          <Button type="submit" disabled={update.isPending || form.formState.isSubmitting}>
            {update.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
