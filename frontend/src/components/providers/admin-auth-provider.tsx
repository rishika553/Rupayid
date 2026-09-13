'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminApiClient, persistAdminSession } from '@/lib/admin-api-client';
import type { AdminPublicProfile } from '@/lib/admin-api-client';
import { clearAdminAuth, readAdminAuth } from '@/lib/admin-auth-storage';

const GENERIC_LOGIN_ERROR = 'Unable to sign in. Check your details and try again.';

interface AdminAuthContextValue {
  admin: AdminPublicProfile | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminPublicProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshAdmin = useCallback(async () => {
    const tokens = readAdminAuth();
    if (!tokens) {
      setAdmin(null);
      adminApiClient.setTokens(null);
      return;
    }
    adminApiClient.setTokens(tokens);
    const response = await adminApiClient.me();
    if (!response.success || !response.data) {
      clearAdminAuth();
      adminApiClient.setTokens(null);
      setAdmin(null);
      return;
    }
    setAdmin(response.data);
  }, []);

  useEffect(() => {
    void refreshAdmin().finally(() => setIsReady(true));
  }, [refreshAdmin]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await adminApiClient.login(username, password);
    if (!response.success || !response.data?.accessToken || !response.data.admin) {
      throw new Error(GENERIC_LOGIN_ERROR);
    }
    persistAdminSession(response.data);
    setAdmin(response.data.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApiClient.logout();
    } catch {
      // still clear local session
    }
    clearAdminAuth();
    adminApiClient.setTokens(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      isReady,
      isAuthenticated: Boolean(admin),
      login,
      logout,
    }),
    [admin, isReady, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
