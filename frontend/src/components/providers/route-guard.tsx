'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminAuth } from '@/components/providers/admin-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

const CUSTOMER_PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password'];
const CUSTOMER_PATHS = [
  '/dashboard',
  '/loans',
  '/repayments',
  '/payments',
  '/kyc',
  '/referral',
  '/notifications',
  '/profile',
];

export function RouteGuard({ children }: { children: ReactNode }) {
  const { isReady: customerReady, isAuthenticated: customerAuthenticated } = useAuth();
  const { isReady: adminReady, isAuthenticated: adminAuthenticated } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isCustomerPublic =
    CUSTOMER_PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/legal');
  const isAdminLogin = pathname === '/admin';
  const isAdminApp = pathname.startsWith('/admin/');
  const isCustomerRoute = CUSTOMER_PATHS.some((route) => matchesRoute(pathname, route));
  const isReady = customerReady && adminReady;

  const redirectTarget =
    !isReady
      ? null
      : !adminAuthenticated && isAdminApp
        ? '/admin'
        : adminAuthenticated && isAdminLogin
          ? '/admin/dashboard'
          : !customerAuthenticated && !isCustomerPublic && !isAdminLogin && !isAdminApp
            ? '/login'
            : customerAuthenticated && isCustomerRoute
              ? null
              : customerAuthenticated && pathname === '/login'
                ? '/dashboard'
                : null;

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  useEffect(() => {
    if (!isReady || !customerAuthenticated) {
      return;
    }
    const keepSessionOnBack = () => {
      const path = window.location.pathname;
      if (path === '/login') {
        router.replace('/dashboard');
      }
    };
    window.addEventListener('popstate', keepSessionOnBack);
    return () => window.removeEventListener('popstate', keepSessionOnBack);
  }, [customerAuthenticated, isReady, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (redirectTarget) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}
