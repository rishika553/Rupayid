import { Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

it('does not log signed file tokens or customer query data', () => {
  const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  try {
    new LoggingInterceptor().intercept({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/v1/files/dev-download?token=private-token', ip: '127.0.0.1' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as never, { handle: () => of(null) }).subscribe();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('GET /api/v1/files/dev-download 200'));
    expect(log.mock.calls.flat().join(' ')).not.toContain('private-token');
  } finally {
    log.mockRestore();
  }
});
