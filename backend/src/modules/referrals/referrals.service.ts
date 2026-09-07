import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_REFERRALS_PER_USER = 50;
const VALIDATE_WINDOW_MS = 60_000;
const VALIDATE_MAX_PER_IP = 20;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PUBLIC_USER = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ReferralsService {
  private readonly validateHits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  normalizeCode(raw: string): string {
    return raw.trim().toUpperCase();
  }

  async provisionForUser(userId: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return null;
    }
    if (user.referralCode) {
      return user;
    }
    const code = await this.allocateUniqueCode();
    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code, referralCodeCreatedAt: now },
    });
    await this.audit.log({
      actionType: 'REFERRAL_CODE_GENERATED',
      entityType: 'User',
      entityId: userId,
      eventCategory: 'REFERRAL',
      changedById: userId,
      changedForUserId: userId,
      message: 'Referral code generated',
      ipAddress: ip,
      userAgent,
    });
    return updated;
  }

  async validateCode(rawCode: string, ip: string, requesterId?: string) {
    this.assertValidateRate(ip);
    const code = this.normalizeCode(rawCode);
    if (!/^RAP-[A-Z0-9]{8}$/.test(code)) {
      return { valid: false, reason: 'invalid_format' as const };
    }
    const owner = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, status: true },
    });
    if (!owner || ['DELETED', 'BANNED', 'SUSPENDED'].includes(owner.status)) {
      return { valid: false, reason: 'not_found' as const };
    }
    if (requesterId && owner.id === requesterId) {
      return { valid: false, reason: 'self' as const };
    }
    const outbound = await this.prisma.referral.count({ where: { referrerId: owner.id } });
    if (outbound >= MAX_REFERRALS_PER_USER) {
      return { valid: false, reason: 'limit' as const };
    }
    return { valid: true as const };
  }

  async applyAtFirstVerification(input: {
    refereeId: string;
    rawCode?: string;
    firstVerification: boolean;
    ip?: string;
    userAgent?: string;
  }) {
    const code = input.rawCode ? this.normalizeCode(input.rawCode) : '';
    if (!code) {
      return null;
    }
    if (!input.firstVerification) {
      await this.reject(input.refereeId, code, 'existing_account', input.ip, input.userAgent);
      return null;
    }

    const owner = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!owner) {
      await this.reject(input.refereeId, code, 'not_found', input.ip, input.userAgent);
      return null;
    }
    if (owner.id === input.refereeId) {
      await this.reject(input.refereeId, code, 'self', input.ip, input.userAgent);
      return null;
    }

    const alreadyReferred = await this.prisma.referral.findUnique({
      where: { refereeId: input.refereeId },
    });
    if (alreadyReferred) {
      await this.reject(input.refereeId, code, 'duplicate', input.ip, input.userAgent);
      return null;
    }

    const outbound = await this.prisma.referral.count({ where: { referrerId: owner.id } });
    if (outbound >= MAX_REFERRALS_PER_USER) {
      await this.reject(input.refereeId, code, 'limit', input.ip, input.userAgent);
      return null;
    }

    try {
      const created = await this.prisma.referral.create({
        data: {
          referrerId: owner.id,
          refereeId: input.refereeId,
          code,
          status: 'ACCEPTED',
          metadata: { appliedAt: new Date().toISOString() },
        },
      });
      await this.audit.log({
        actionType: 'REFERRAL_CREATED',
        entityType: 'Referral',
        entityId: created.id,
        eventCategory: 'REFERRAL',
        changedById: input.refereeId,
        changedForUserId: owner.id,
        message: 'Referral relationship created',
        ipAddress: input.ip,
        userAgent: input.userAgent,
      });
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.reject(input.refereeId, code, 'duplicate', input.ip, input.userAgent);
        return null;
      }
      throw error;
    }
  }

  async getMine(userId: string) {
    await this.provisionForUser(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCodeCreatedAt: true,
        createdAt: true,
      },
    });
    const [inbound, outbound] = await Promise.all([
      this.prisma.referral.findUnique({
        where: { refereeId: userId },
        include: { referrer: { select: PUBLIC_USER } },
      }),
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        include: { referee: { select: PUBLIC_USER } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      code: user?.referralCode || null,
      codeCreatedAt: user?.referralCodeCreatedAt || user?.createdAt || null,
      invitePath: user?.referralCode ? `/login?ref=${user.referralCode}` : null,
      referredBy: inbound
        ? {
            firstName: inbound.referrer.firstName,
            lastName: inbound.referrer.lastName,
            acceptedAt: inbound.createdAt,
            status: inbound.status,
          }
        : null,
      referredCount: outbound.length,
      referred: outbound.map((row) => ({
        firstName: row.referee.firstName,
        lastName: row.referee.lastName,
        createdAt: row.createdAt,
        status: row.status,
      })),
    };
  }

  private async allocateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = this.randomCode();
      const taken = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!taken) {
        return code;
      }
    }
    throw new Error('Unable to allocate a unique referral code');
  }

  private randomCode(): string {
    const bytes = crypto.randomBytes(8);
    let body = '';
    for (let i = 0; i < 8; i += 1) {
      body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return `RAP-${body}`;
  }

  private assertValidateRate(ip: string) {
    const now = Date.now();
    const current = this.validateHits.get(ip);
    if (!current || now > current.resetAt) {
      this.validateHits.set(ip, { count: 1, resetAt: now + VALIDATE_WINDOW_MS });
      return;
    }
    current.count += 1;
    if (current.count > VALIDATE_MAX_PER_IP) {
      throw new BadRequestException('Too many referral lookups. Try again shortly.');
    }
  }

  private async reject(
    userId: string,
    code: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.audit.log({
      actionType: 'REFERRAL_REJECTED',
      entityType: 'Referral',
      entityId: userId,
      eventCategory: 'REFERRAL',
      changedById: userId,
      message: 'Referral application rejected',
      metadata: { reason, codePrefix: code.slice(0, 4) },
      ipAddress: ip,
      userAgent,
    });
  }
}
