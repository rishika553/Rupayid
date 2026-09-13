'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, cn } from '@rupayaid/ui';
import { useAdminAuth } from '@/components/providers/admin-auth-provider';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin';

  if (isLogin) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuth();

  async function onSignOut() {
    await logout();
    router.replace('/admin');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <p className="text-sm font-semibold tracking-tight">RupayAid Admin</p>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/dashboard"
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  pathname === '/admin/dashboard' && 'font-medium text-foreground',
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/kyc"
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  pathname.startsWith('/admin/kyc') && 'font-medium text-foreground',
                )}
              >
                KYC
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {admin?.username ? (
              <span className="text-sm text-muted-foreground">{admin.username}</span>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void onSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
