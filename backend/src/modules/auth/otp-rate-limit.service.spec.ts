import { HttpStatus } from '@nestjs/common';
import { OtpRateLimitService } from './otp-rate-limit.service';

describe('OtpRateLimitService', () => {
  it('allows requests under the max and blocks after', async () => {
    const service = new OtpRateLimitService({ incr: async () => 1 } as never, {
      get: (key: string) => (key === 'NODE_ENV' ? 'test' : undefined),
    } as never);

    await service.assertWithinLimit('otp:test', 3, 60_000);
    await service.assertWithinLimit('otp:test', 3, 60_000);
    await service.assertWithinLimit('otp:test', 3, 60_000);
    await expect(service.assertWithinLimit('otp:test', 3, 60_000)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });
});
