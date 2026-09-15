'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { apiClient, requireApi } from '@/lib/api-client';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await requireApi(apiClient.post('/auth/forgot-password', values));
      setDone(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send reset link');
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <a href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to RupayAid
      </a>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Enter the email on your account. If it exists, we will send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-muted-foreground">
              If that email is registered, check your inbox (and API logs in development) for a reset link.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
                {form.formState.errors.email ? (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <a href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
              Back to sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
