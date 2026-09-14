const TOKEN_KEY = 'rupayaid.auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function readAuth(): StoredAuth | null {
  const local = browserStorage('localStorage');
  const session = browserStorage('sessionStorage');
  const raw = local?.getItem(TOKEN_KEY) || session?.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.accessToken || !parsed?.refreshToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeAuth(tokens: StoredAuth): void {
  const payload = JSON.stringify(tokens);
  browserStorage('localStorage')?.setItem(TOKEN_KEY, payload);
  browserStorage('sessionStorage')?.removeItem(TOKEN_KEY);
}

export function clearAuth(): void {
  browserStorage('localStorage')?.removeItem(TOKEN_KEY);
  browserStorage('sessionStorage')?.removeItem(TOKEN_KEY);
}
