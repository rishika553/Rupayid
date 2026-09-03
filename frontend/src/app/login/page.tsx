'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@rupayaid/ui';
import { apiClient } from '@/lib/api-client';
import { writeAuth } from '@/lib/auth-storage';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const response = await apiClient.post<{
      otpRequestId: string | null;
      message: string;
      expiresAt: string;
    }>('/auth/request-otp', { phone });
    setLoading(false);
    if (!response.success || !response.data?.otpRequestId) {
      setError(response.error || 'Unable to send OTP');
      return;
    }
    setOtpRequestId(response.data.otpRequestId);
    setMessage(response.data.message);
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!otpRequestId) {
      return;
    }
    setError(null);
    setLoading(true);
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/verify-otp', { phone, otp, otpRequestId });
    setLoading(false);
    if (!response.success || !response.data?.accessToken) {
      setError(response.error || 'Invalid OTP');
      return;
    }
    writeAuth({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    });
    apiClient.setTokens(response.data);
    router.push('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Customer sign in</CardTitle>
          <CardDescription>We will send a one-time code to your mobile number.</CardDescription>
        </CardHeader>
        <CardContent>
          {!otpRequestId ? (
            <form className="space-y-4" onSubmit={requestOtp}>
              <Input
                inputMode="numeric"
                autoComplete="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={verifyOtp}>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                value={otp}
                maxLength={6}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify and continue'}
              </Button>
            </form>
          )}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
