'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, requireApi } from '@/lib/api-client';
import { clearAuth, readAuth, writeAuth } from '@/lib/auth-storage';
import type { CustomerUser } from '@/lib/types';
import { useToast } from '@/components/ui/toaster';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
};

interface AuthContextValue {
  user: CustomerUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => Promise<void>;
  signInWithGoogle: (idToken: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const applySession = useCallback((data: AuthTokens, message: string) => {
    writeAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    apiClient.setTokens(data);
    setUser(data.user);
    toast({ title: message, description: 'Welcome to RupayAid.' });
  }, [toast]);

  const refreshUser = useCallback(async () => {
    const tokens = readAuth();
    if (!tokens) {
      setUser(null);
      apiClient.setTokens(null);
      return;
    }
    apiClient.setTokens(tokens);
    try {
      const me = await requireApi(apiClient.get<CustomerUser>('/auth/me'));
      setUser(me);
    } catch {
      clearAuth();
      apiClient.setTokens(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setIsReady(true));
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await requireApi(apiClient.post<AuthTokens>('/auth/login', { email, password }));
      applySession(data, 'Signed in');
    },
    [applySession],
  );

  const createAccount = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      referralCode?: string;
    }) => {
      const data = await requireApi(
        apiClient.post<AuthTokens>('/auth/register', {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
          referralCode: input.referralCode || undefined,
        }),
      );
      applySession(data, 'Account created');
    },
    [applySession],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string, referralCode?: string) => {
      const data = await requireApi(
        apiClient.post<AuthTokens>('/auth/google', {
          idToken,
          referralCode: referralCode || undefined,
        }),
      );
      applySession(data, 'Signed in');
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // still clear local session
    }
    clearAuth();
    apiClient.setTokens(null);
    setUser(null);
    toast({ title: 'Signed out' });
  }, [toast]);

  const value = useMemo(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      signIn,
      createAccount,
      signInWithGoogle,
      logout,
      refreshUser,
    }),
    [user, isReady, signIn, createAccount, signInWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
