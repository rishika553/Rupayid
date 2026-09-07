'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import { apiClient, requireApi } from '@/lib/api-client';
import { normalizeLoginPhone } from '@/lib/phone';

const schema = z.object({
  phone: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  referralCode: z
    .string()
    .regex(/^$|^RAP-[A-Za-z0-9]{8}$/i, 'Use a code like RAP-ABCD2345'),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { requestOtp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', referralCode: '' },
  });

  useEffect(() => {
    const ref = search.get('ref');
    if (ref) {
      form.setValue('referralCode', ref.toUpperCase());
    }
  }, [form, search]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const phone = normalizeLoginPhone(values.phone);
    const code = values.referralCode.trim().toUpperCase();
    if (code) {
      try {
        const result = await requireApi(
          apiClient.post<{ valid: boolean; reason?: string }>('/referrals/validate', { code }),
        );
        if (!result.valid) {
          setFormError(
            result.reason === 'self'
              ? 'You cannot use your own referral code'
              : result.reason === 'limit'
                ? 'This referral code cannot accept more sign-ups'
                : 'That referral code is not valid',
          );
          return;
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Could not check referral code');
        return;
      }
    }
    try {
      await requestOtp(phone, code || undefined);
      router.push('/verify-otp');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send OTP. Try again.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            No password. In development, SMS is not sent — use the on-screen code after this step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              const phone = normalizeLoginPhone(values.phone);
              form.setValue('phone', phone);
              return onSubmit({ ...values, phone });
            })}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="9876543210"
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register('phone')}
              />
              {form.formState.errors.phone ? (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral code (optional)</Label>
              <Input
                id="referralCode"
                placeholder="RAP-ABCD2345"
                className="uppercase"
                aria-invalid={Boolean(form.formState.errors.referralCode)}
                {...form.register('referralCode')}
              />
              {form.formState.errors.referralCode ? (
                <p className="text-sm text-destructive">{form.formState.errors.referralCode.message}</p>
              ) : null}
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" href="/">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
