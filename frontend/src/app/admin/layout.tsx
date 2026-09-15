'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, cn } from '@rupayaid/ui';
import { useAdminAuth } from '@/components/providers/admin-auth-provider';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/kyc', label: 'KYC' },
  { href: '/admin/loans', label: 'Loans' },
  { href: '/admin/disbursements', label: 'Disbursements' },
  { href: '/admin/repayments', label: 'Repayments' },
];

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
          <div className="flex min-w-0 items-center gap-6">
            <p className="shrink-0 text-sm font-semibold tracking-tight">RupayAid Admin</p>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    (item.href === '/admin/dashboard' ? pathname === item.href : pathname.startsWith(item.href)) &&
                      'font-medium text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ))}
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
