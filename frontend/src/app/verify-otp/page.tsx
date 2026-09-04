'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { readPendingOtp } from '@/lib/auth-storage';

const schema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const { verifyOtp, requestOtp } = useAuth();
  const [pending, setPending] = useState<{ phone: string; otpRequestId: string; referralCode?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
  }, [router]);

  async function onSubmit(values: FormValues) {
    if (!pending) {
      return;
    }
    setFormError(null);
    try {
      await verifyOtp(pending.phone, values.otp, pending.otpRequestId, pending.referralCode);
      router.push('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Verification failed');
    }
  }

  async function resend() {
    if (!pending) {
      return;
    }
    setFormError(null);
    try {
      await requestOtp(pending.phone, pending.referralCode);
      const next = readPendingOtp();
      if (next) {
        setPending(next);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not resend OTP');
    }
  }

  if (!pending) {
    return <p className="p-6 text-sm text-muted-foreground">Preparing verification…</p>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter OTP</CardTitle>
          <CardDescription>Code sent to {pending.phone}. It expires in a few minutes.</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => void resend()}>
              Resend OTP
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
