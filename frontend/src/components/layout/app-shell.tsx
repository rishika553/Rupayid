'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  CalendarClock,
  ChevronDown,
  CreditCard,
  Gift,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@rupayaid/ui';
import { Logo } from '@/components/brand/logo';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge, statusTone } from '@/components/ui/badge';
import { useCustomerDashboard } from '@/hooks/use-customer-data';
import { kycStatusLabel } from '@/lib/kyc';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/loans', label: 'My Loans', icon: Landmark },
  { href: '/repayments', label: 'Repayments', icon: CalendarClock },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/kyc', label: 'KYC Verification', icon: ShieldCheck },
  { href: '/referral', label: 'Referral Program', icon: Gift },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/profile', label: 'Settings', icon: Settings },
  { href: '/legal/grievance', label: 'Help & Support', icon: LifeBuoy },
];

const COLLAPSED_KEY = 'rupayaid.sidebar.collapsed';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const dashboard = useCustomerDashboard().data;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const firstName = user?.firstName || dashboard?.customer.firstName || '';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Account';
  const unread = dashboard?.notifications.unreadCount ?? 0;
  const kycStatus = dashboard?.kyc.status;

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem(COLLAPSED_KEY, current ? '0' : '1');
      return !current;
    });
  }

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="portal-root">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/80 bg-card/90 backdrop-blur transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
        aria-label="Sidebar"
      >
        <div className={cn('flex h-16 items-center border-b border-border/70', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
          <Logo compact={collapsed} />
          {collapsed ? null : (
            <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
          )}
        </div>

        <SidebarNav pathname={pathname} collapsed={collapsed} />

        <div className="space-y-2 border-t border-border/70 p-3">
          {collapsed ? (
            <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} className="mx-auto" />
          ) : kycStatus ? (
            <Link
              href={dashboard?.kyc.actionHref || '/kyc'}
              className="flex items-center justify-between gap-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-xs font-medium text-secondary-foreground hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
                KYC status
              </span>
              <Badge tone={statusTone(kycStatus)}>{kycStatusLabel(kycStatus)}</Badge>
            </Link>
          ) : null}
        </div>
      </aside>

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-ml-1 rounded-lg p-2 text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <Logo className="lg:hidden" />

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/notifications"
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                className={cn(
                  'relative rounded-full p-2.5 text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive(pathname, '/notifications') && 'bg-secondary',
                )}
              >
                <Bell className="size-5" aria-hidden />
                {unread ? (
                  <span className="absolute right-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-cta px-1 text-[10px] font-bold leading-[1.1rem] text-white ring-2 ring-background">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
              <AccountMenu
                name={fullName}
                firstName={firstName}
                onProfile={pathname === '/profile'}
                onLogout={() => void signOut()}
              />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <Dialog.Content className="portal-root fixed inset-y-0 min-h-0 left-0 z-50 flex w-[84%] max-w-xs flex-col bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
              <Logo />
              <Dialog.Close
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Customer portal sections</Dialog.Description>

            {kycStatus ? (
              <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-secondary/70 px-3 py-2.5 text-xs font-medium text-secondary-foreground">
                <span>KYC status</span>
                <Badge tone={statusTone(kycStatus)}>{kycStatusLabel(kycStatus)}</Badge>
              </div>
            ) : null}

            <SidebarNav pathname={pathname} collapsed={false} />

            <div className="border-t border-border/70 p-3">
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="size-5" aria-hidden />
                Log out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SidebarNav({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Customer">
      <NavGroup items={NAV} pathname={pathname} collapsed={collapsed} />
      <div>
        {collapsed ? (
          <div className="mx-auto mb-3 h-px w-8 bg-border" />
        ) : (
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Account
          </p>
        )}
        <NavGroup items={SECONDARY_NAV} pathname={pathname} collapsed={collapsed} />
      </div>
    </nav>
  );
}

function NavGroup({
  items,
  pathname,
  collapsed,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                collapsed && 'justify-center px-0',
                active && 'bg-secondary text-primary',
              )}
            >
              {active ? (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-500" aria-hidden />
              ) : null}
              <Icon
                className={cn('size-5 shrink-0', active ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-primary')}
                aria-hidden
              />
              {collapsed ? null : <span className="truncate">{label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarToggle({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={cn(
        'grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

function AccountMenu({
  name,
  firstName,
  onProfile,
  onLogout,
}: {
  name: string;
  firstName: string;
  onProfile: boolean;
  onLogout: () => void;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'R';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className={cn(
          'flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          onProfile && 'bg-secondary',
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{firstName || name}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:inline" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="portal-root z-50 min-h-0 min-w-52 rounded-xl border bg-card p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-primary">{name}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-secondary focus:bg-secondary"
            >
              <Settings className="size-4 text-muted-foreground" aria-hidden />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 outline-none hover:bg-red-50 focus:bg-red-50"
            onSelect={() => {
              onLogout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}
