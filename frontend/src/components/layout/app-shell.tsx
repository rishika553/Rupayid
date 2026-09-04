'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Home, Landmark, Menu, UserRound, Wallet } from 'lucide-react';
import { Button, cn } from '@rupayaid/ui';
import { useAuth } from '@/components/providers/auth-provider';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Home' },
  { href: '/loans', label: 'Loans' },
  { href: '/loans/apply', label: 'Apply' },
  { href: '/kyc', label: 'KYC' },
  { href: '/payments', label: 'Payments' },
  { href: '/repayments', label: 'Repayments' },
  { href: '/notifications', label: 'Alerts' },
  { href: '/referral', label: 'Refer' },
  { href: '/profile', label: 'Profile' },
];

const MOBILE = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/loans', label: 'Loans', icon: Landmark },
  { href: '/payments', label: 'Pay', icon: Wallet },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Me', icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-primary">
            RupayAid
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground',
                  (item.href === '/kyc' ? pathname.startsWith('/kyc') : pathname === item.href) &&
                    'bg-secondary font-medium text-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => void logout()}>
              Log out
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-xs bg-card p-4">
            <p className="mb-4 font-semibold">Menu</p>
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Button className="mt-4" variant="outline" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden"
        aria-label="Mobile"
      >
        <ul className="grid grid-cols-5">
          {MOBILE.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground',
                    active && 'text-primary',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
