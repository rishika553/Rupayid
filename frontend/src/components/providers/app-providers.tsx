'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { AdminAuthProvider } from '@/components/providers/admin-auth-provider';
import { RouteGuard } from '@/components/providers/route-guard';
import { ToastProvider } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <RouteGuard>{children}</RouteGuard>
          </AdminAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
