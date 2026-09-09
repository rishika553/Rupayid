'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, requireApi } from '@/lib/api-client';
import {
  clearAuth,
  clearPendingOtp,
  readAuth,
  writeAuth,
  writePendingOtp,
} from '@/lib/auth-storage';
import type { CustomerUser } from '@/lib/types';
import { useToast } from '@/components/ui/toaster';

interface AuthContextValue {
  user: CustomerUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  requestOtp: (
    phone: string,
    referralCode?: string,
    displayName?: { firstName: string; lastName?: string; name?: string },
  ) => Promise<void>;
  verifyOtp: (
    phone: string,
    otp: string,
    otpRequestId: string,
    referralCode?: string,
    displayName?: { firstName?: string; lastName?: string; name?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  const requestOtp = useCallback(async (
    phone: string,
    referralCode?: string,
    displayName?: { firstName: string; lastName?: string; name?: string },
  ) => {
    const data = await requireApi(
      apiClient.post<{
        otpRequestId: string;
        expiresAt: string;
        cooldownSeconds?: number;
        message: string;
        developmentOtp?: string;
      }>('/auth/request-otp', {
        phone,
        firstName: displayName?.firstName,
        lastName: displayName?.lastName,
        name: displayName?.name,
      }),
    );
    const cooldownUntil = data.cooldownSeconds
      ? new Date(Date.now() + data.cooldownSeconds * 1000).toISOString()
      : undefined;
    writePendingOtp({
      phone,
      otpRequestId: data.otpRequestId,
      expiresAt: data.expiresAt,
      cooldownUntil,
      referralCode: referralCode?.trim() ? referralCode.trim().toUpperCase() : undefined,
      developmentOtp: data.developmentOtp,
      firstName: displayName?.firstName,
      lastName: displayName?.lastName,
    });
    toast({
      title: data.developmentOtp ? 'Development OTP ready' : 'OTP sent',
      description: data.developmentOtp
        ? `No SMS was sent. Use ${data.developmentOtp} to continue.`
        : 'Enter the 6-digit code to continue.',
    });
  }, [toast]);

  const verifyOtp = useCallback(
    async (phone: string, otp: string, otpRequestId: string, referralCode?: string, displayName?: { firstName?: string; lastName?: string; name?: string }) => {
      const data = await requireApi(
        apiClient.post<{ accessToken: string; refreshToken: string; user: CustomerUser }>(
          '/auth/verify-otp',
          {
            phone,
            otp,
            otpRequestId,
            referralCode: referralCode || undefined,
            firstName: displayName?.firstName,
            lastName: displayName?.lastName,
            name: displayName?.name,
          },
        ),
      );
      writeAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      apiClient.setTokens(data);
      clearPendingOtp();
      setUser(data.user);
      toast({ title: 'Signed in', description: 'Welcome to RupayAid.' });
    },
    [toast],
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
      requestOtp,
      verifyOtp,
      logout,
      refreshUser,
    }),
    [user, isReady, requestOtp, verifyOtp, logout, refreshUser],
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

