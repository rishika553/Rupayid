const TOKEN_KEY = 'rupayaid.auth';
const PENDING_OTP_KEY = 'rupayaid.pending-otp';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

export interface PendingOtp {
  phone: string;
  otpRequestId: string;
  expiresAt: string;
  cooldownUntil?: string;
  referralCode?: string;
  developmentOtp?: string;
  firstName?: string;
  lastName?: string;
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

export function readPendingOtp(): PendingOtp | null {
  const raw = browserStorage('sessionStorage')?.getItem(PENDING_OTP_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingOtp;
  } catch {
    return null;
  }
}

export function writePendingOtp(pending: PendingOtp): void {
  browserStorage('sessionStorage')?.setItem(PENDING_OTP_KEY, JSON.stringify(pending));
}

export function clearPendingOtp(): void {
  browserStorage('sessionStorage')?.removeItem(PENDING_OTP_KEY);
}
