import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    actionType: string;
    entityType: string;
    entityId: string;
    eventCategory?: string;
    changedById?: string;
    changedForUserId?: string;
    severity?: string;
    message?: string;
    diffSummary?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    isActorAdmin?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorIsAdminBoolean: data.isActorAdmin || false,
        actionType: data.actionType as never,
        entityType: data.entityType,
        entityId: data.entityId,
        eventCategory: data.eventCategory || data.entityType,
        changedById: data.changedById || null,
        changedForUserId: data.changedForUserId || null,
        severity: (data.severity || 'INFO') as never,
        message: data.message,
        diffSummary: (data.diffSummary || undefined) as never,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestId: data.requestId,
        metadata: (data.metadata || undefined) as never,
      },
    });
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByActor(changedById: string) {
    return this.prisma.auditLog.findMany({
      where: { changedById },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findByAction(actionType: string) {
    return this.prisma.auditLog.findMany({
      where: { actionType: actionType as never },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
