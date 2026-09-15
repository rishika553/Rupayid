import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from './notification-queue.service';
import { sealVariables } from './notification-payload.crypto';

export type CustomerNotificationEvent =
  | 'OTP'
  | 'PASSWORD_RESET'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'LOAN_SUBMITTED'
  | 'LOAN_APPROVED'
  | 'LOAN_REJECTED'
  | 'DISBURSEMENT'
  | 'REPAYMENT_DUE'
  | 'REPAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED';

type PublishInput = {
  eventType: CustomerNotificationEvent;
  userId: string;
  variables?: Record<string, unknown>;
  referenceId?: string;
  dedupeKey?: string;
  destination?: string;
};

const ROUTES: Record<CustomerNotificationEvent, Array<'INAPP' | 'SMS' | 'EMAIL'>> = {
  OTP: ['SMS'],
  PASSWORD_RESET: ['EMAIL'],
  KYC_SUBMITTED: ['INAPP', 'EMAIL'],
  KYC_APPROVED: ['INAPP', 'EMAIL', 'SMS'],
  KYC_REJECTED: ['INAPP', 'EMAIL', 'SMS'],
  LOAN_SUBMITTED: ['INAPP', 'EMAIL'],
  LOAN_APPROVED: ['INAPP', 'EMAIL', 'SMS'],
  LOAN_REJECTED: ['INAPP', 'EMAIL'],
  DISBURSEMENT: ['INAPP', 'EMAIL', 'SMS'],
  REPAYMENT_DUE: ['INAPP', 'EMAIL', 'SMS'],
  REPAYMENT_SUCCESSFUL: ['INAPP', 'EMAIL', 'SMS'],
  PAYMENT_FAILED: ['INAPP', 'SMS'],
};

const COPY: Record<CustomerNotificationEvent, { title: string; body: string }> = {
  OTP: { title: 'Your RupayAid OTP', body: 'Your OTP is {{otp}}. It expires shortly.' },
  PASSWORD_RESET: {
    title: 'Reset your RupayAid password',
    body: 'Use this link to choose a new password. It expires in one hour: {{resetUrl}}',
  },
  KYC_SUBMITTED: { title: 'KYC submitted', body: 'Your KYC application {{reference}} is under review.' },
  KYC_APPROVED: { title: 'KYC approved', body: 'Your KYC verification has been approved.' },
  KYC_REJECTED: { title: 'KYC needs attention', body: 'Your KYC was rejected. {{reason}}' },
  LOAN_SUBMITTED: { title: 'Loan application submitted', body: 'Application {{applicationNumber}} was submitted.' },
  LOAN_APPROVED: { title: 'Loan approved', body: 'Application {{applicationNumber}} has been approved.' },
  LOAN_REJECTED: { title: 'Loan application update', body: 'Application {{applicationNumber}} was rejected. {{reason}}' },
  DISBURSEMENT: { title: 'Loan disbursed', body: '₹{{amount}} has been disbursed for {{applicationNumber}}.' },
  REPAYMENT_DUE: { title: 'Repayment due', body: 'Installment {{installmentNumber}} of ₹{{amount}} is due on {{dueDate}}.' },
  REPAYMENT_SUCCESSFUL: { title: 'Repayment successful', body: 'We received your repayment of ₹{{amount}}.' },
  PAYMENT_FAILED: { title: 'Payment failed', body: 'Your payment of ₹{{amount}} could not be completed.' },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Persists delivery records before enqueueing. Awaiting this method never waits
   * for Digimiles or Resend; provider calls happen in the worker.
   */
  async publish(input: PublishInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, phoneNumber: true },
    });
    if (!user) throw new NotFoundException('Notification recipient not found');
    const variables = input.variables || {};
    const records = [];
    for (const type of ROUTES[input.eventType]) {
      const destination =
        input.destination || (type === 'SMS' ? user.phoneNumber : type === 'EMAIL' ? user.email : undefined);
      if (type !== 'INAPP' && !destination) continue;
      const slug = `${input.eventType.toLowerCase()}_${type.toLowerCase()}`;
      const template = await this.prisma.notificationTemplate.findUnique({ where: { slug } });
      const title = render(template?.titleTemplate || COPY[input.eventType].title, variables);
      const body = render(template?.bodyTemplate || COPY[input.eventType].body, variables);
      const encryptedVariables =
        input.eventType === 'OTP'
          ? sealVariables(variables, this.payloadSecret())
          : undefined;
      const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:${type}` : undefined;
      try {
        const record = await this.prisma.notification.create({
          data: {
            userId: input.userId,
            templateId: template?.id || null,
            dedupeKey,
            type,
            eventType: input.eventType,
            status: 'QUEUED',
            title,
            body: input.eventType === 'OTP' ? 'Your one-time password was requested.' : body,
            channel: type === 'INAPP' ? 'ADMIN_NOTIFY' : type,
            data: {
              destination,
              variables: input.eventType === 'OTP' ? undefined : variables,
              encryptedVariables,
              workerBody:
                input.eventType === 'OTP'
                  ? 'Your one-time password was requested.'
                  : body,
            } as never,
            referenceId: input.referenceId,
          } as never,
        });
        records.push(record);
        void this.queue.enqueue(record.id).catch((error: unknown) => {
          this.logger.error(
            `Could not enqueue notification ${record.id}: ${
              error instanceof Error ? error.message : 'queue unavailable'
            }`,
          );
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }
    return records;
  }

  /** Compatibility entry point; all delivery still goes through the queue. */
  async send(data: {
    userId?: string;
    templateSlug?: string;
    type: string;
    title: string;
    body: string;
    channel?: string;
    data?: Record<string, unknown>;
    priority?: string;
    referenceId?: string;
  }) {
    if (!data.userId) throw new NotFoundException('Notification recipient not found');
    const template = data.templateSlug
      ? await this.prisma.notificationTemplate.findUnique({ where: { slug: data.templateSlug } })
      : null;
    const type = data.type as 'INAPP' | 'SMS' | 'EMAIL';
    if (!['INAPP', 'SMS', 'EMAIL'].includes(type)) {
      throw new BadRequestException('Unsupported notification type');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, phoneNumber: true },
    });
    if (!user) throw new NotFoundException('Notification recipient not found');
    const destination = type === 'SMS' ? user.phoneNumber : type === 'EMAIL' ? user.email : undefined;
    const record = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        templateId: template?.id || null,
        type,
        eventType: data.templateSlug?.toUpperCase() || 'ADMIN_MESSAGE',
        status: 'QUEUED',
        title: data.title,
        body: data.body,
        channel: type === 'INAPP' ? 'ADMIN_NOTIFY' : type,
        data: { destination, variables: data.data || {}, workerBody: data.body } as never,
        priority: data.priority || 'normal',
        referenceId: data.referenceId,
      } as never,
    });
    void this.queue.enqueue(record.id).catch((error: unknown) => {
      this.logger.error(`Could not enqueue notification ${record.id}: ${String(error)}`);
    });
    return record;
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    page = Math.max(1, page || 1);
    limit = Math.min(100, Math.max(1, limit || 20));
    const skip = (page - 1) * limit;
    const where = { userId, type: 'INAPP' as const };
    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } as never }),
    ]);

    return {
      data: rows.map(customerView),
      unreadCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(id: string, userId: string) {
    const record = await this.prisma.notification.findFirst({
      where: { id, userId, type: 'INAPP' },
    });
    if (!record) throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() } as never,
    });
    return customerView(updated);
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, type: 'INAPP', readAt: null } as never,
      data: { readAt: new Date() } as never,
    });
    return { updated: result.count };
  }

  async getTemplates() {
    return this.prisma.notificationTemplate.findMany({ where: { isActive: true } });
  }

  async createTemplate(data: {
    slug: string;
    channel: string;
    titleTemplate: string;
    bodyTemplate: string;
    subjectTemplate?: string;
  }) {
    return this.prisma.notificationTemplate.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        channel: data.channel as never,
        titleTemplate: data.titleTemplate,
        bodyTemplate: data.bodyTemplate,
        subjectTemplate: data.subjectTemplate,
        isActive: true,
      },
      update: {
        titleTemplate: data.titleTemplate,
        bodyTemplate: data.bodyTemplate,
      },
    });
  }

  @Cron('0 */5 * * * *')
  async recoverQueuedNotifications() {
    await this.queue.recoverQueued();
  }

  @Cron('0 0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async enqueueRepaymentDueReminders() {
    const now = new Date();
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
    const schedules = await this.prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { gte: now, lte: until },
        status: { in: ['SCHEDULED', 'PARTIALLY_PAID'] },
      },
      include: {
        loanApplication: { select: { userId: true, applicationNumber: true } },
      },
    });
    for (const item of schedules) {
      const outstanding = new Prisma.Decimal(item.totalAmount).minus(item.paidAmount);
      if (outstanding.lte(0)) continue;
      await this.publish({
        eventType: 'REPAYMENT_DUE',
        userId: item.loanApplication.userId,
        referenceId: item.id,
        dedupeKey: `repayment-due:${item.id}:${item.dueDate.toISOString().slice(0, 10)}`,
        variables: {
          installmentNumber: item.sequence,
          amount: outstanding.toFixed(2),
          dueDate: item.dueDate.toLocaleDateString('en-IN'),
          applicationNumber: item.loanApplication.applicationNumber,
        },
      });
    }
  }

  private payloadSecret() {
    return (
      this.config.get<string>('NOTIFICATION_PAYLOAD_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'development-notification-secret'
    );
  }
}

function render(template: string, variables: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    String(variables[key] ?? ''),
  ).trim();
}

function customerView(record: {
  id: string;
  eventType?: string | null;
  status: string;
  title: string | null;
  body: string | null;
  referenceId: string | null;
  createdAt: Date;
  readAt?: Date | null;
}) {
  return {
    id: record.id,
    type: record.eventType || 'UPDATE',
    title: record.title,
    body: record.body,
    referenceId: record.referenceId,
    deliveryStatus: record.status,
    readAt: record.readAt || null,
    isRead: Boolean(record.readAt),
    createdAt: record.createdAt,
  };
}

