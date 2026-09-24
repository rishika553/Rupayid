export const BLOCKED_USER_STATUSES = ['SUSPENDED', 'BANNED', 'LOCKED', 'DELETED'] as const;

export const ACCOUNT_BLOCKED = 'This account cannot sign in';

const MINUTE = 60 * 1000;

export const AUTH_RATE_LIMITS = {
  loginPerIp: { max: 20, windowMs: 15 * MINUTE },
  loginPerEmail: { max: 10, windowMs: 15 * MINUTE },
  registerPerIp: { max: 10, windowMs: 60 * MINUTE },
  googlePerIp: { max: 30, windowMs: 15 * MINUTE },
  forgotPerIp: { max: 10, windowMs: 60 * MINUTE },
  forgotPerEmail: { max: 3, windowMs: 60 * MINUTE },
  resetPerIp: { max: 10, windowMs: 60 * MINUTE },
  refreshPerIp: { max: 60, windowMs: 15 * MINUTE },
} as const;
