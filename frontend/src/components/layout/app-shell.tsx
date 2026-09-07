'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CircleUserRound,
  CreditCard,
  FileCheck2,
  Home,
  Landmark,
  LogOut,
  MoreHorizontal,
  Share2,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, cn } from '@rupayaid/ui';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge, statusTone } from '@/components/ui/badge';
import { useCustomerDashboard } from '@/hooks/use-customer-data';
import { kycStatusLabel } from '@/lib/kyc';

const DESKTOP_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/loans', label: 'Loans' },
  { href: '/repayments', label: 'Repayments' },
  { href: '/payments', label: 'Payments' },
  { href: '/kyc', label: 'KYC' },
  { href: '/referral', label: 'Referrals' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/profile', label: 'Profile' },
] as const;

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/loans', label: 'Loans', icon: Landmark },
  { href: '/repayments', label: 'Repayments', icon: Wallet },
  { href: '/notifications', label: 'Notifications', icon: Bell },
] as const;

const MORE_NAV = [
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/kyc', label: 'KYC', icon: FileCheck2 },
  { href: '/referral', label: 'Referrals', icon: Share2 },
  { href: '/profile', label: 'Profile', icon: CircleUserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const dashboard = useCustomerDashboard().data;
  const [moreOpen, setMoreOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const unreadCount = dashboard?.notifications.unreadCount ?? 0;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link
            href="/dashboard"
            className="shrink-0 text-base font-semibold tracking-tight text-primary"
            aria-label="RupayAid dashboard"
          >
            RupayAid
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Customer">
            {DESKTOP_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                    active && 'bg-secondary font-medium text-foreground',
                  )}
                >
                  {item.label}
                  {item.href === '/notifications' && unreadCount > 0 ? (
                    <NotificationBadge count={unreadCount} />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2" aria-label="Authenticated customer">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials || 'CU'}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-32 truncate text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">Customer</p>
              </div>
            </div>
            {dashboard?.kyc.status ? (
              <span className="hidden xl:inline-flex">
                <Badge tone={statusTone(dashboard.kyc.status)}>
                  KYC: {kycStatusLabel(dashboard.kyc.status)}
                </Badge>
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden" aria-label="Mobile customer">
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => (
            <MobileLink
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
              badge={item.href === '/notifications' ? unreadCount : 0}
            />
          ))}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="customer-more-menu"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] text-muted-foreground',
                moreOpen && 'font-medium text-primary',
              )}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div
          id="customer-more-menu"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="more-menu-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 pb-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="more-menu-title" className="font-semibold">More</h2>
                <p className="text-sm text-muted-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-md p-2 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {dashboard?.kyc.status ? (
              <div className="mb-3 rounded-lg bg-secondary p-3 text-sm">
                <span className="text-muted-foreground">KYC status </span>
                <Badge tone={statusTone(dashboard.kyc.status)}>
                  {kycStatusLabel(dashboard.kyc.status)}
                </Badge>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium hover:bg-secondary"
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <Button className="mt-4 w-full" variant="outline" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] text-muted-foreground',
          active && 'font-medium text-primary',
        )}
      >
        <span className="relative">
          <Icon className="h-5 w-5" aria-hidden />
          {badge > 0 ? <NotificationBadge count={badge} compact /> : null}
        </span>
        {label}
      </Link>
    </li>
  );
}

function NotificationBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground',
        compact ? 'absolute -right-3 -top-2' : 'ml-1 align-top',
      )}
      aria-label={`${count} unread notifications`}
    >
      {label}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}
