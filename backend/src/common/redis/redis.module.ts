import type { Provider } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService) => {
    const url = configService.get<string>('REDIS_URL');

    if (!url) {
      // Return a mock that never errors when called but skips real ops
      return {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 1,
        expire: async () => 1,
        ping: async () => 'PONG',
        quit: async () => 'OK',
        disconnect: () => {},
        on: () => {},
        incr: async () => 1,
        pexpire: async () => 1,
      } as unknown as Redis;
    }

    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    client.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    client.on('connect', () => {
      console.log('Redis connected');
    });

    return client;
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
