import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { openVariables, sealVariables } from './notification-payload.crypto';

function harness() {
  const rows: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === 'user-1'
          ? { email: 'customer@example.com', phoneNumber: '+919876543210' }
          : null,
      ),
    },
    notificationTemplate: {
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      upsert: jest.fn(),
    },
    notification: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `notification-${rows.length + 1}`,
          createdAt: new Date(),
          readAt: null,
          ...data,
        };
        rows.push(record);
        return record;
      }),
      findMany: jest.fn(async () => rows.filter((row) => row.type === 'INAPP')),
      count: jest.fn(async ({ where }: { where: { readAt?: null } }) =>
        rows.filter((row) => row.type === 'INAPP' && (!('readAt' in where) || row.readAt == null)).length,
      ),
      findFirst: jest.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        rows.find((row) => row.id === where.id && row.userId === where.userId) || null,
      ),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = rows.find((row) => row.id === where.id);
        Object.assign(record || {}, data);
        return record;
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    repaymentSchedule: { findMany: jest.fn(async () => []) },
  };
  const queue = { enqueue: jest.fn(async () => undefined), recoverQueued: jest.fn() };
  const config = { get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'secret' : undefined)) };
  return {
    rows,
    queue,
    service: new NotificationsService(prisma as never, queue as never, config as never),
  };
}

describe('NotificationsService', () => {
  it('persists one delivery record per routed channel and enqueues it', async () => {
    const { service, rows, queue } = harness();
    await service.publish({
      eventType: 'KYC_SUBMITTED',
      userId: 'user-1',
      referenceId: 'kyc-1',
      dedupeKey: 'kyc-submitted:kyc-1',
      variables: { reference: 'KYC-1' },
    });
    expect(rows.map((row) => row.type)).toEqual(['INAPP', 'EMAIL']);
    expect(rows[0].body).toContain('KYC-1');
    expect(queue.enqueue).toHaveBeenCalledTimes(2);
  });

  it('does not store a plaintext OTP', async () => {
    const { service, rows } = harness();
    await service.publish({
      eventType: 'OTP',
      userId: 'user-1',
      destination: '+919876543210',
      variables: { otp: '123456' },
    });
    expect(JSON.stringify(rows[0])).not.toContain('123456');
  });

  it('enforces ownership when marking one notification read', async () => {
    const { service } = harness();
    await service.publish({ eventType: 'KYC_APPROVED', userId: 'user-1' });
    await expect(service.markAsRead('notification-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const updated = await service.markAsRead('notification-1', 'user-1');
    expect(updated.isRead).toBe(true);
  });
});

describe('notification payload encryption', () => {
  it('round-trips worker variables', () => {
    const sealed = sealVariables({ otp: '654321' }, 'secret');
    expect(sealed).not.toContain('654321');
    expect(openVariables(sealed, 'secret')).toEqual({ otp: '654321' });
  });
});
