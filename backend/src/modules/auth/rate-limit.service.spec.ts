import { HttpStatus } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('allows requests under the max and blocks after', async () => {
    const service = new RateLimitService({ incr: async () => 1 } as never, {
      get: (key: string) => (key === 'NODE_ENV' ? 'test' : undefined),
    } as never);

    await service.assertWithinLimit('limit:test', 3, 60_000);
    await service.assertWithinLimit('limit:test', 3, 60_000);
    await service.assertWithinLimit('limit:test', 3, 60_000);
    await expect(service.assertWithinLimit('limit:test', 3, 60_000)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });
});
