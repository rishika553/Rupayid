'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rupayaid/ui';
import { apiClient } from '@/lib/api-client';
import { clearAuth, readAuth } from '@/lib/auth-storage';

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: string;
  phoneVerified: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const tokens = readAuth();
    if (!tokens) {
      router.replace('/login');
      return;
    }
    apiClient.setTokens(tokens);
    void apiClient.get<Me>('/auth/me').then((response) => {
      if (!response.success || !response.data) {
        clearAuth();
        router.replace('/login');
        return;
      }
      setMe(response.data);
    });
  }, [router]);

  async function logout() {
    await apiClient.post('/auth/logout');
    clearAuth();
    apiClient.setTokens(null);
    router.replace('/login');
  }

  if (!me) {
    return <p className="p-8 text-sm text-muted-foreground">Loading your account…</p>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Customer dashboard</CardTitle>
          <CardDescription>You are signed in. KYC and loans are not part of this step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {me.firstName} {me.lastName}
          </p>
          <p>{me.phoneNumber}</p>
          <p>Status: {me.status}</p>
          <p>Phone verified: {me.phoneVerified ? 'yes' : 'no'}</p>
          <Button className="mt-4" variant="outline" onClick={() => void logout()}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
