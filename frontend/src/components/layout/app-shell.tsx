'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
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
import { cn } from '@rupayaid/ui';
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
] as const;

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/loans', label: 'Loans', icon: Landmark },
  { href: '/repayments', label: 'Repayments', icon: Wallet },
] as const;

const MORE_NAV = [
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/kyc', label: 'KYC', icon: FileCheck2 },
  { href: '/referral', label: 'Referrals', icon: Share2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const dashboard = useCustomerDashboard().data;
  const [moreOpen, setMoreOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  async function signOut() {
    await logout();
    router.replace('/login');
  }

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
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <AccountMenu
              name={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Account'}
              onProfile={pathname === '/profile'}
              onLogout={() => void signOut()}
            />
            {dashboard?.kyc.status ? (
              <span className="hidden xl:inline-flex">
                <Badge tone={statusTone(dashboard.kyc.status)}>
                  KYC: {kycStatusLabel(dashboard.kyc.status)}
                </Badge>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden" aria-label="Mobile customer">
        <ul className="grid grid-cols-4">
          {MOBILE_NAV.map((item) => (
            <MobileLink
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/profile"
                className="flex items-center justify-center rounded-lg border p-3 text-sm font-medium hover:bg-secondary"
              >
                Profile
              </Link>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-secondary"
                onClick={() => void signOut()}
              >
                <LogOut className="h-4 w-4 text-primary" aria-hidden />
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({
  name,
  onProfile,
  onLogout,
}: {
  name: string;
  onProfile: boolean;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className={cn(
          'max-w-40 truncate rounded-md px-2 py-1 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          onProfile && 'bg-secondary',
        )}
      >
        {name}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-44 rounded-lg border bg-card p-1 shadow-lg"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none hover:bg-secondary focus:bg-secondary"
            >
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-secondary focus:bg-secondary"
            onSelect={() => {
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MobileLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
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
        <Icon className="h-5 w-5" aria-hidden />
        {label}
      </Link>
    </li>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}
