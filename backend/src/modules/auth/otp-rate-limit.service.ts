import { HttpException, HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@Injectable()
export class OtpRateLimitService {
  private readonly memory = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async assertWithinLimit(key: string, max: number, windowMs: number): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Rate limiter unavailable');
      }
      this.consumeMemory(key, max, windowMs);
      return;
    }

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }
    if (count > max) {
      throw new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  resetMemory(): void {
    this.memory.clear();
  }

  private consumeMemory(key: string, max: number, windowMs: number): void {
    const now = Date.now();
    const current = this.memory.get(key);
    if (!current || now > current.resetAt) {
      this.memory.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    current.count += 1;
    if (current.count > max) {
      throw new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
