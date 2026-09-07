'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

const PUBLIC_PATHS = ['/', '/login', '/verify-otp'];
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
  const { isReady, isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAdminRoute = matchesRoute(pathname, '/admin');
  const isCustomerRoute = CUSTOMER_PATHS.some((route) => matchesRoute(pathname, route));
  const isAdmin = user?.roles?.some(({ role }) => role.name === 'ADMIN') ?? false;
  const redirectTarget =
    !isReady
      ? null
      : !isAuthenticated && !isPublic
        ? '/login'
        : isAuthenticated && isAdmin && (isCustomerRoute || pathname === '/login' || pathname === '/verify-otp')
          ? '/admin'
          : isAuthenticated && !isAdmin && isAdminRoute
            ? '/dashboard'
            : isAuthenticated && !isAdmin && (pathname === '/login' || pathname === '/verify-otp')
              ? '/dashboard'
              : null;

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

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
