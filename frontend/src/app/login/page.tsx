'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { useAuth } from '@/components/providers/auth-provider';
import { apiClient, requireApi } from '@/lib/api-client';

const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const createAccountSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'Enter your first name')
      .max(80, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Enter your last name').max(80, 'Last name is too long'),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
    referralCode: z
      .string()
      .regex(/^$|^RAP-[A-Za-z0-9]{8}$/i, 'Use a code like RAP-ABCD2345'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignInValues = z.infer<typeof signInSchema>;
type CreateAccountValues = z.infer<typeof createAccountSchema>;

function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { signIn, createAccount, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formError, setFormError] = useState<string | null>(null);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const signUpForm = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
    },
  });

  useEffect(() => {
    const ref = search.get('ref');
    if (ref) {
      signUpForm.setValue('referralCode', ref.toUpperCase());
      setMode('signup');
    }
  }, [search, signUpForm]);

  async function checkReferral(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return true;
    }
    try {
      const result = await requireApi(
        apiClient.post<{ valid: boolean; reason?: string }>('/referrals/validate', { code: trimmed }),
      );
      if (result.valid) {
        return true;
      }
      setFormError(
        result.reason === 'self'
          ? 'You cannot use your own referral code'
          : result.reason === 'limit'
            ? 'This referral code cannot accept more sign-ups'
            : 'That referral code is not valid',
      );
      return false;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not check referral code');
      return false;
    }
  }

  async function onSignIn(values: SignInValues) {
    setFormError(null);
    try {
      await signIn(values.email.trim().toLowerCase(), values.password);
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not sign in');
    }
  }

  async function onCreateAccount(values: CreateAccountValues) {
    setFormError(null);
    const referralCode = values.referralCode.trim().toUpperCase();
    if (!(await checkReferral(referralCode))) {
      return;
    }
    try {
      await createAccount({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        referralCode: referralCode || undefined,
      });
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create account');
    }
  }

  async function onGoogle(idToken: string) {
    setFormError(null);
    const referralCode = signUpForm.getValues('referralCode').trim().toUpperCase();
    if (referralCode && !(await checkReferral(referralCode))) {
      return;
    }
    try {
      await signInWithGoogle(idToken, referralCode || undefined);
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Google sign-in failed');
    }
  }

  const submitting = signInForm.formState.isSubmitting || signUpForm.formState.isSubmitting;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <a href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Back to RupayAid
      </a>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Use your email and password, or continue with Google.'
              : 'Create an account to open your dashboard. Referral code is optional.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-secondary p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'signin' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => {
                setFormError(null);
                setMode('signin');
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => {
                setFormError(null);
                setMode('signup');
              }}
            >
              Create account
            </button>
          </div>

          {mode === 'signin' ? (
            <form className="space-y-4" onSubmit={signInForm.handleSubmit(onSignIn)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(signInForm.formState.errors.email)}
                  {...signInForm.register('email')}
                />
                {signInForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(signInForm.formState.errors.password)}
                  {...signInForm.register('password')}
                />
                {signInForm.formState.errors.password ? (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                ) : null}
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button className="w-full" type="submit" disabled={submitting}>
                {signInForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={signUpForm.handleSubmit(onCreateAccount)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    aria-invalid={Boolean(signUpForm.formState.errors.firstName)}
                    {...signUpForm.register('firstName')}
                  />
                  {signUpForm.formState.errors.firstName ? (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.firstName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    aria-invalid={Boolean(signUpForm.formState.errors.lastName)}
                    {...signUpForm.register('lastName')}
                  />
                  {signUpForm.formState.errors.lastName ? (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.lastName.message}</p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(signUpForm.formState.errors.email)}
                  {...signUpForm.register('email')}
                />
                {signUpForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(signUpForm.formState.errors.password)}
                  {...signUpForm.register('password')}
                />
                {signUpForm.formState.errors.password ? (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(signUpForm.formState.errors.confirmPassword)}
                  {...signUpForm.register('confirmPassword')}
                />
                {signUpForm.formState.errors.confirmPassword ? (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral coupon (optional)</Label>
                <Input
                  id="referralCode"
                  placeholder="RAP-ABCD2345"
                  className="uppercase"
                  aria-invalid={Boolean(signUpForm.formState.errors.referralCode)}
                  {...signUpForm.register('referralCode')}
                />
                {signUpForm.formState.errors.referralCode ? (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.referralCode.message}</p>
                ) : null}
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button className="w-full" type="submit" disabled={submitting}>
                {signUpForm.formState.isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          )}

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton onCredential={(token) => void onGoogle(token)} disabled={submitting} />
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
      <AuthForm />
    </Suspense>
  );
}
