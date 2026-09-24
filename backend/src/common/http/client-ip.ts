import type { Request } from 'express';

/**
 * Relies on Express `trust proxy` (set in main.ts) to resolve the caller behind Render's proxy.
 * Never read `x-forwarded-for` directly: its leftmost entry is supplied by the client.
 */
export function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
