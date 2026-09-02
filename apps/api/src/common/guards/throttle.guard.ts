import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly maxRequests = 100,
    private readonly windowMs = 60_000,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    record.count++;

    if (record.count > this.maxRequests) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
