'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@rupayaid/ui';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function useCollapsedSidebar(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  function toggle() {
    setCollapsed((current) => {
      window.localStorage.setItem(storageKey, current ? '0' : '1');
      return !current;
    });
  }

  return [collapsed, toggle] as const;
}

export function NavGroup({
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

export function NavSectionLabel({ collapsed, children }: { collapsed: boolean; children: string }) {
  return collapsed ? (
    <div className="mx-auto mb-3 h-px w-8 bg-border" />
  ) : (
    <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

export function SidebarToggle({
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

export function initialsOf(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'R'
  );
}
