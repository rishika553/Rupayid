export const OTP_CONFIG = {
  length: 6,
  expiryMs: 5 * 60 * 1000,
  maxAttempts: 5,
  resendCooldownMs: 60 * 1000,
  requestPerPhone: { max: 3, windowMs: 60 * 60 * 1000 },
  requestPerIp: { max: 10, windowMs: 15 * 60 * 1000 },
  verifyPerPhone: { max: 10, windowMs: 15 * 60 * 1000 },
  verifyPerIp: { max: 20, windowMs: 15 * 60 * 1000 },
} as const;

export const BLOCKED_USER_STATUSES = ['SUSPENDED', 'BANNED', 'LOCKED', 'DELETED'] as const;

export const GENERIC_OTP_SENT = 'If this number is eligible, an OTP has been sent.';
export const GENERIC_OTP_INVALID = 'Invalid or expired OTP';
export const OTP_EXPIRED = 'This OTP has expired. Request a new code.';
export const OTP_LOCKED = 'Too many attempts. Request a new code.';
export const ACCOUNT_BLOCKED = 'This account cannot sign in';
