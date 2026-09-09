'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import { readPendingOtp, type PendingOtp } from '@/lib/auth-storage';

const schema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const { verifyOtp, requestOtp } = useAuth();
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [ready, setReady] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    const stored = readPendingOtp();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setPending(stored);
    if (stored.developmentOtp) {
      form.setValue('otp', stored.developmentOtp);
    }
    setReady(true);
  }, [form, router]);

  const expired = pending ? Date.parse(pending.expiresAt) <= Date.now() : false;

  async function onSubmit(values: FormValues) {
    if (!pending) {
      return;
    }
    if (Date.parse(pending.expiresAt) <= Date.now()) {
      setFormError('This OTP has expired. Request a new code.');
      return;
    }
    setFormError(null);
    try {
      await verifyOtp(pending.phone, values.otp, pending.otpRequestId, pending.referralCode, {
        firstName: pending.firstName,
        lastName: pending.lastName,
      });
      router.push('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Verification failed');
    }
  }

  async function resend() {
    if (!pending) {
      return;
    }
    const cooldownUntil = pending.cooldownUntil ? Date.parse(pending.cooldownUntil) : 0;
    if (cooldownUntil > Date.now()) {
      const seconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setFormError(`Please wait ${seconds} seconds before requesting another OTP.`);
      return;
    }
    setFormError(null);
    setResending(true);
    try {
      await requestOtp(
        pending.phone,
        pending.referralCode,
        pending.firstName
          ? { firstName: pending.firstName, lastName: pending.lastName }
          : undefined,
      );
      const next = readPendingOtp();
      if (next) {
        setPending(next);
        if (next.developmentOtp) {
          form.setValue('otp', next.developmentOtp);
        }
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  }

  if (!ready || !pending) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter OTP</CardTitle>
          <CardDescription>
            {pending.developmentOtp
              ? `No SMS was sent to ${pending.phone}. Use the development code below.`
              : `Code sent to ${pending.phone}. It expires in a few minutes.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.developmentOtp ? (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Development code (SMS skipped): <strong>{pending.developmentOtp}</strong>
            </p>
          ) : null}
          {expired ? (
            <p className="mb-4 text-sm text-destructive">This OTP has expired. Request a new code.</p>
          ) : null}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="otp">One-time password</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                aria-invalid={Boolean(form.formState.errors.otp)}
                {...form.register('otp')}
              />
              {form.formState.errors.otp ? (
                <p className="text-sm text-destructive">{form.formState.errors.otp.message}</p>
              ) : null}
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting || expired}>
              {form.formState.isSubmitting ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
              disabled={resending}
              onClick={() => void resend()}
            >
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
            <Link className="text-muted-foreground underline-offset-4 hover:underline" href="/login">
              Change number
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

