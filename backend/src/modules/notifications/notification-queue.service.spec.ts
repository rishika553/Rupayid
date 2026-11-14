import { NotificationQueueService } from './notification-queue.service';
import { ProviderTransportError } from '../../common/http/bounded-fetch';

it('records ambiguous delivery as failed and does not schedule a duplicate send', async () => {
  const row = { id: 'n1', status: 'PENDING', type: 'SMS', attemptCount: 0, data: { destination: 'test' }, user: null };
  const prisma = {
    notification: { findUnique: jest.fn(async () => row), update: jest.fn(async ({ data }) => Object.assign(row, data)) },
    notificationDeliveryAttempt: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (operations) => Promise.all(operations)),
  };
  const provider = { name: 'test', send: jest.fn().mockRejectedValue(new ProviderTransportError()) };
  const service = new NotificationQueueService(prisma as never, { get: jest.fn() } as never, provider, provider);
  const deliver = service as unknown as { deliver(id: string): Promise<void> };
  await expect(deliver.deliver('n1')).resolves.toBeUndefined();
  expect(row.status).toBe('FAILED');
  expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'notification/n1' }));
  await deliver.deliver('n1');
  expect(provider.send).toHaveBeenCalledTimes(1);
});
