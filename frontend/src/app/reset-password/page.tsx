'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, requireApi } from '@/lib/api-client';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Values = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    if (!token) {
      setFormError('This reset link is missing a token. Request a new one.');
      return;
    }
    try {
      await requireApi(apiClient.post('/auth/reset-password', { token, password: values.password }));
      router.replace('/login');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update password');
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <a href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to RupayAid
      </a>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a password with at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-4">
          <Skeleton className="h-48 w-full max-w-md" />
        </main>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
