'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/components/providers/admin-auth-provider';

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Enter your username')
    .max(64, 'Username is too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Enter a valid username'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await login(values.username.trim(), values.password);
      router.replace('/admin/dashboard');
    } catch {
      setFormError('Unable to sign in. Check your details and try again.');
    }
  }

  return (
    <main className="portal-hero flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-2">
        <Logo href="/admin" />
        <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
          Admin
        </span>
      </div>
      <Card className="portal-card w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-xl bg-secondary text-emerald-700">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <CardTitle className="font-display text-2xl font-extrabold tracking-[-0.03em] text-primary">
            Admin sign in
          </CardTitle>
          <CardDescription>Use your staff username and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(form.formState.errors.username)}
                {...form.register('username')}
              />
              {form.formState.errors.username ? (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <Button
              className="w-full rounded-full bg-cta font-bold text-cta-foreground hover:bg-cta/90"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
