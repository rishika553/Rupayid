const ADMIN_TOKEN_KEY = 'rupayaid.admin.auth';

export interface StoredAdminAuth {
  accessToken: string;
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAdminAuth(): StoredAdminAuth | null {
  const raw = browserStorage()?.getItem(ADMIN_TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredAdminAuth;
    if (!parsed?.accessToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminAuth(tokens: StoredAdminAuth): void {
  browserStorage()?.setItem(ADMIN_TOKEN_KEY, JSON.stringify(tokens));
}

export function clearAdminAuth(): void {
  browserStorage()?.removeItem(ADMIN_TOKEN_KEY);
}
