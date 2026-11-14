import { HealthController } from './health.controller';

describe('readiness probe', () => {
  it('fails readiness when the database is unavailable', async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockRejectedValue(new Error('offline')) } as never);
    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
  });

  it('reports readiness for a connected database', async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never);
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });
});
