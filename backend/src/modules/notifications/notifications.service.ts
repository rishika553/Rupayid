import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    let templateId: string | null = null;

    if (data.templateSlug) {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { slug: data.templateSlug },
      });
      if (template) templateId = template.id;
    }

    return this.prisma.notification.create({
      data: {
        userId: data.userId || null,
        templateId,
        type: data.type as never,
        status: 'QUEUED',
        title: data.title,
        body: data.body,
        channel: (data.channel || 'ADMIN_NOTIFY') as never,
        data: (data.data || undefined) as never,
        priority: data.priority || 'normal',
        referenceId: data.referenceId,
      },
    });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
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
}
