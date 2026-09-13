export const ADMIN_AUTH_TYP = 'admin';
export const ADMIN_AUTH_AUDIENCE = 'admin';

export const ADMIN_LOGIN_RATE = {
  perIp: { max: 10, windowMs: 15 * 60 * 1000 },
  perUsername: { max: 5, windowMs: 15 * 60 * 1000 },
} as const;

export const GENERIC_ADMIN_LOGIN_FAILED = 'Invalid credentials';
export const ADMIN_ACCOUNT_DISABLED = 'Admin account is disabled';
