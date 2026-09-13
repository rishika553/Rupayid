import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SENSITIVE_KEY =
  /password|passwd|otp|token|secret|authorization|credential|api[_-]?key|access[_-]?key|refresh|cookie|filestorage|private[_-]?key|session/i;

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
        diffSummary: sanitizeAuditJson(data.diffSummary) as never,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestId: data.requestId,
        metadata: sanitizeAuditJson(data.metadata) as never,
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

export function sanitizeAuditJson(value?: Record<string, unknown> | null) {
  if (!value) {
    return undefined;
  }
  const cleaned = sanitizeUnknown(value);
  if (!cleaned || typeof cleaned !== 'object' || Array.isArray(cleaned)) {
    return undefined;
  }
  return cleaned as Record<string, unknown>;
}

function sanitizeUnknown(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) {
    return undefined;
  }
  if (value == null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(childKey)) {
        continue;
      }
      out[childKey] = sanitizeUnknown(childValue, childKey);
    }
    return out;
  }
  return value;
}
