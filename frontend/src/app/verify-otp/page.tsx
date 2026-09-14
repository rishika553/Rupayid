'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyOtpRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
      Redirecting to sign in…
    </main>
  );
}
