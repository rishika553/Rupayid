'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

const PUBLIC_PATHS = ['/', '/login', '/verify-otp'];

export function RouteGuard({ children }: { children: ReactNode }) {
  const { isReady, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!isPublic && !isAuthenticated) {
      router.replace('/login');
    }
    if (isAuthenticated && (pathname === '/login' || pathname === '/verify-otp')) {
      router.replace('/dashboard');
    }
  }, [isReady, isAuthenticated, isPublic, pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isPublic && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
