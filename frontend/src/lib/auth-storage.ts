const TOKEN_KEY = 'rupayaid.auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

export function readAuth(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function writeAuth(tokens: StoredAuth): void {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
