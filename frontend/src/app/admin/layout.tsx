'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Banknote,
  CalendarClock,
  ChevronDown,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';
import { cn } from '@rupayaid/ui';
import { Logo } from '@/components/brand/logo';
import { NavGroup, NavSectionLabel, SidebarToggle, initialsOf, useCollapsedSidebar } from '@/components/layout/sidebar';
import type { NavItem } from '@/components/layout/sidebar';
import { useAdminAuth } from '@/components/providers/admin-auth-provider';

const OVERVIEW_NAV: NavItem[] = [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

const OPERATIONS_NAV: NavItem[] = [
  { href: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck },
  { href: '/admin/loans', label: 'Loans', icon: Landmark },
  { href: '/admin/disbursements', label: 'Disbursements', icon: Banknote },
  { href: '/admin/repayments', label: 'Repayments', icon: CalendarClock },
];

const COLLAPSED_KEY = 'rupayaid.admin.sidebar.collapsed';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin';

  if (isLogin) {
    return <div className="portal-root">{children}</div>;
  }

  return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const [collapsed, toggleCollapsed] = useCollapsedSidebar(COLLAPSED_KEY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const username = admin?.username || 'Admin';

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function onSignOut() {
    await logout();
    router.replace('/admin');
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
          <div className="flex items-center gap-2">
            <Logo href="/admin/dashboard" compact={collapsed} />
            {collapsed ? null : <AdminTag />}
          </div>
          {collapsed ? null : <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />}
        </div>

        <AdminNav pathname={pathname} collapsed={collapsed} />

        <div className="border-t border-border/70 p-3">
          {collapsed ? (
            <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} className="mx-auto" />
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-xs font-medium text-secondary-foreground">
              <UserCog className="size-4 text-emerald-600" aria-hidden />
              <span className="truncate">Signed in as {username}</span>
            </div>
          )}
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
            <div className="flex items-center gap-2 lg:hidden">
              <Logo href="/admin/dashboard" />
              <AdminTag />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <AdminAccountMenu username={username} onLogout={() => void onSignOut()} />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <Dialog.Content className="portal-root fixed inset-y-0 left-0 z-50 flex min-h-0 w-[84%] max-w-xs flex-col bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
              <div className="flex items-center gap-2">
                <Logo href="/admin/dashboard" />
                <AdminTag />
              </div>
              <Dialog.Close
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Admin portal sections</Dialog.Description>

            <AdminNav pathname={pathname} collapsed={false} />

            <div className="border-t border-border/70 p-3">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="size-5" aria-hidden />
                Sign out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function AdminTag() {
  return (
    <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
      Admin
    </span>
  );
}

function AdminNav({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Admin">
      <NavGroup items={OVERVIEW_NAV} pathname={pathname} collapsed={collapsed} />
      <div>
        <NavSectionLabel collapsed={collapsed}>Operations</NavSectionLabel>
        <NavGroup items={OPERATIONS_NAV} pathname={pathname} collapsed={collapsed} />
      </div>
    </nav>
  );
}

function AdminAccountMenu({ username, onLogout }: { username: string; onLogout: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initialsOf(username)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{username}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:inline" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="portal-root z-50 min-h-0 min-w-52 rounded-xl border bg-card p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-primary">{username}</p>
            <p className="text-xs text-muted-foreground">Staff account</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 outline-none hover:bg-red-50 focus:bg-red-50"
            onSelect={() => {
              onLogout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
