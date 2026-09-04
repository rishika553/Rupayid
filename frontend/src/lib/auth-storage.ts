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
  referralCode?: string;
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

export function readPendingOtp(): PendingOtp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(PENDING_OTP_KEY);
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
  sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(pending));
}

export function clearPendingOtp(): void {
  sessionStorage.removeItem(PENDING_OTP_KEY);
}

