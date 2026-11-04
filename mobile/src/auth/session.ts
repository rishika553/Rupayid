import { QueryClient } from '@tanstack/react-query';
import { ApiClient, API_BASE_URL, requireApi } from '@/api/client';
import { readAuth, writeAuth, clearAuth, type StoredAuth } from './secure-storage';
import type { CustomerUser } from '@/types';

interface AuthResponse extends StoredAuth { user: CustomerUser }

export class AuthSession {
  private listeners = new Set<() => void>();
  // Order SecureStore writes/deletes across logout, refresh and account switches.
  private storage: Promise<unknown> = Promise.resolve();
  private nextId = 0;
  private snapshot = this.createSnapshot(false);

  private createSnapshot(isReady: boolean) {
    const id = ++this.nextId;
    return {
      id, isReady, user: null as CustomerUser | null,
      recoveryError: null as string | null,
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
      client: new ApiClient(API_BASE_URL, {
        persist: tokens => this.persist(id, tokens),
        unauthorized: () => {
          if (this.snapshot.id === id) void this.endSession();
        },
      }),
    };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish() { for (const listener of this.listeners) listener(); }

  private queueStorage<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.storage.then(operation);
    this.storage = result.catch(() => undefined);
    return result;
  }

  private replace(isReady = true) {
    const previous = this.snapshot;
    previous.client.dispose();
    void previous.queryClient.cancelQueries();
    previous.queryClient.clear();
    this.snapshot = this.createSnapshot(isReady);
    this.publish();
    return this.snapshot;
  }

  private async persist(id: number, tokens: StoredAuth) {
    await this.queueStorage(async () => {
      if (this.snapshot.id !== id) throw new Error('Session ended');
      await writeAuth(tokens);
    });
    if (this.snapshot.id !== id) throw new Error('Session ended');
  }

  private async endSession() {
    this.replace();
    await this.queueStorage(clearAuth);
  }

  refreshUser = async () => {
    // Revalidation is not an account switch: retain a known user's cache/UI.
    const session = this.snapshot;
    this.snapshot = { ...session, recoveryError: null, isReady: Boolean(session.user) };
    this.publish();
    try {
      if (!session.user) {
        const tokens = await this.queueStorage(readAuth);
        if (this.snapshot.id !== session.id) return;
        session.client.setTokens(tokens);
        if (!tokens) return;
      }
      const user = await requireApi(session.client.get<CustomerUser>('/auth/me'));
      if (this.snapshot.id !== session.id) return;
      this.snapshot = { ...session, user, isReady: true, recoveryError: null };
      this.publish();
    } catch {
      // Unauthorized responses end the session through the client callback.
      // A cold start cannot show private data until /auth/me has succeeded.
      if (this.snapshot.id === session.id) {
        this.snapshot = { ...this.snapshot, recoveryError: 'Unable to restore your session. Check your connection and retry.' };
      }
    } finally {
      if (this.snapshot.id === session.id) {
        this.snapshot = { ...this.snapshot, isReady: true };
        this.publish();
      }
    }
  };

  private async authenticate(endpoint: string, body: unknown) {
    const session = this.replace();
    await this.queueStorage(clearAuth);
    try {
      const data = await requireApi(session.client.post<AuthResponse>(endpoint, body));
      await this.persist(session.id, data);
      if (this.snapshot.id !== session.id) throw new Error('Session ended');
      session.client.setTokens(data);
      this.snapshot = { ...session, user: data.user };
      this.publish();
    } catch (error) {
      if (this.snapshot.id === session.id) await this.queueStorage(clearAuth);
      throw error;
    }
  }

  signIn = (email: string, password: string) =>
    this.authenticate('/auth/login', { email, password });

  createAccount = (input: {
    firstName: string; lastName: string; email: string; password: string; referralCode?: string;
  }) => this.authenticate('/auth/register', { ...input, referralCode: input.referralCode || undefined });

  signInWithGoogle = (idToken: string, referralCode?: string) =>
    this.authenticate('/auth/google', { idToken, referralCode: referralCode || undefined });

  logout = async () => {
    const revocation = this.snapshot.client.revokeSession();
    // Invalidate the client/cache/UI before awaiting storage or the network.
    await this.endSession();
    void revocation.catch(() => undefined);
  };
}
