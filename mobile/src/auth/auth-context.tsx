import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AuthSession } from './session';

type AuthContextValue = ReturnType<AuthSession['getSnapshot']> & {
  isAuthenticated: boolean;
  signIn: AuthSession['signIn'];
  createAccount: AuthSession['createAccount'];
  signInWithGoogle: AuthSession['signInWithGoogle'];
  logout: AuthSession['logout'];
  refreshUser: AuthSession['refreshUser'];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new AuthSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { void session.refreshUser(); }, [session]);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const value: AuthContextValue = {
    ...state,
    isAuthenticated: Boolean(state.user),
    signIn: session.signIn,
    createAccount: session.createAccount,
    signInWithGoogle: session.signInWithGoogle,
    logout: session.logout,
    refreshUser: session.refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={state.queryClient}><>{children}</></QueryClientProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
