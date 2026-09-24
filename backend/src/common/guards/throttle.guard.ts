import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from '../../modules/auth/rate-limit.service';
import { clientIp } from '../http/client-ip';

const MAX_REQUESTS_PER_WINDOW = 100;
const WINDOW_MS = 60_000;

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(private readonly rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    await this.rateLimit.assertWithinLimit(
      `throttle:ip:${clientIp(request)}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS,
    );
    return true;
  }
}
