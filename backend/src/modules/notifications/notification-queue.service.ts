import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import {
  EMAIL_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
  type NotificationProvider,
} from './providers/notification-provider';
import { openVariables } from './notification-payload.crypto';

const QUEUE_NAME = 'customer-notifications';
const MAX_ATTEMPTS = 5;

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;
  private readonly fallbackJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(SMS_NOTIFICATION_PROVIDER) private readonly sms: NotificationProvider,
    @Inject(EMAIL_NOTIFICATION_PROVIDER) private readonly email: NotificationProvider,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!usableRedisUrl(redisUrl)) {
      this.logger.warn('Redis is not configured; notification jobs use asynchronous in-process fallback');
      return;
    }
    this.connection = new Redis(redisUrl!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
    this.worker = new Worker(
      QUEUE_NAME,
      (job: Job<{ notificationId: string }>) => this.deliver(job.data.notificationId),
      { connection: this.connection, concurrency: 5 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Notification job ${job?.id || 'unknown'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }

  async enqueue(notificationId: string, delay = 0) {
    if (this.queue) {
      await this.queue.add(
        'deliver',
        { notificationId },
        {
          jobId: notificationId,
          attempts: MAX_ATTEMPTS,
          backoff: { type: 'exponential', delay: 1_000 },
          delay,
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      );
      return;
    }
    if (this.fallbackJobs.has(notificationId)) return;
    this.fallbackJobs.add(notificationId);
    setTimeout(() => void this.deliverFallback(notificationId, 1), delay);
  }

  async recoverQueued() {
    const pending = await this.prisma.notification.findMany({
      where: { status: { in: ['QUEUED', 'RETRY'] } },
      select: { id: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    await Promise.all(pending.map((item) => this.enqueue(item.id)));
  }

  private async deliverFallback(notificationId: string, attempt: number) {
    try {
      await this.deliver(notificationId);
      this.fallbackJobs.delete(notificationId);
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        setTimeout(
          () => void this.deliverFallback(notificationId, attempt + 1),
          1_000 * 2 ** (attempt - 1),
        );
      } else {
        this.fallbackJobs.delete(notificationId);
        this.logger.error(
          `Notification ${notificationId} exhausted fallback retries: ${messageOf(error)}`,
        );
      }
    }
  }

  private async deliver(notificationId: string) {
    const raw = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: { select: { email: true, phoneNumber: true } },
      },
    });
    if (!raw || ['DELIVERED', 'SENT', 'CANCELLED'].includes(raw.status)) {
      return;
    }
    const notification = raw as typeof raw & {
      attemptCount: number;
      eventType: string | null;
      provider: string | null;
      user: { email: string; phoneNumber: string | null } | null;
    };
    const attemptNumber = (notification.attemptCount || 0) + 1;
    const data = asRecord(notification.data);
    const channel = notification.type;
    const provider =
      channel === 'SMS' ? this.sms : channel === 'EMAIL' ? this.email : null;
    const providerName = provider?.name || 'inapp';
    const attempts = this.prisma.notificationDeliveryAttempt;

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'PENDING',
        provider: providerName,
        attemptCount: attemptNumber,
        error: null,
      } as never,
    });
    await attempts.create({
      data: {
        notificationId: notification.id,
        attemptNumber,
        provider: providerName,
        status: 'PENDING',
      },
    });

    try {
      let providerMessageId = `inapp-${notification.id}`;
      if (provider) {
        const destination =
          stringValue(data.destination) ||
          (channel === 'SMS'
            ? notification.user?.phoneNumber || ''
            : notification.user?.email || '');
        if (!destination) {
          throw new Error(`No ${channel.toLowerCase()} destination for notification`);
        }
        const result = await provider.send({
          to: destination,
          subject: notification.title || 'RupayAid update',
          body: stringValue(data.workerBody) || notification.body || '',
          eventType: notification.eventType || 'OTHER',
          variables: this.deliveryVariables(data),
        });
        providerMessageId = result.providerMessageId;
      }
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'DELIVERED',
            sentAt: now,
            deliveredAt: now,
            providerMessageId,
            error: null,
          },
        }),
        attempts.update({
          where: {
            notificationId_attemptNumber: { notificationId, attemptNumber },
          },
          data: {
            status: 'DELIVERED',
            providerMessageId,
            completedAt: now,
          },
        }),
      ]);
    } catch (error) {
      const exhausted = attemptNumber >= MAX_ATTEMPTS;
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: exhausted ? 'FAILED' : 'RETRY',
            error: messageOf(error),
            failedAt: exhausted ? now : null,
          },
        }),
        attempts.update({
          where: {
            notificationId_attemptNumber: { notificationId, attemptNumber },
          },
          data: {
            status: 'FAILED',
            error: messageOf(error),
            completedAt: now,
          },
        }),
      ]);
      throw error;
    }
  }

  private deliveryVariables(data: Record<string, unknown>) {
    const encrypted = stringValue(data.encryptedVariables);
    if (encrypted) {
      return openVariables(
        encrypted,
        this.config.get<string>('NOTIFICATION_PAYLOAD_SECRET') ||
          this.config.get<string>('JWT_SECRET') ||
          'development-notification-secret',
      );
    }
    return stringRecord(asRecord(data.variables));
  }
}

function usableRedisUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['redis:', 'rediss:'].includes(url.protocol) && !['host', 'localhost.invalid'].includes(url.hostname);
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringRecord(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? '')]),
  );
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1_000) : 'Notification delivery failed';
}

