import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { parseDurationToMs, sha256 } from './crypto.util';
import { ACCOUNT_BLOCKED, BLOCKED_USER_STATUSES } from './auth.constants';

const SELECT_USER = {
  id: true,
  email: true,
  phoneNumber: true,
  phoneVerified: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
  roles: {
    select: {
      role: {
        select: { name: true },
      },
    },
  },
} as const;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueCustomerSession(userId: string, ip: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: SELECT_USER });
    if (!user || this.isBlocked(user.status) || user.status !== 'ACTIVE') {
      throw new ForbiddenException(ACCOUNT_BLOCKED);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return this.createSessionPair(user, ip, userAgent);
  }

  async refresh(refreshToken: string, ip: string, userAgent?: string) {
    let payload: { sub: string; sid: string; familyId: string; typ: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (
      !session ||
      session.status !== 'ACTIVE' ||
      session.tokenType !== 'REFRESH' ||
      session.tokenSha256 !== sha256(refreshToken) ||
      session.expiresAt <= new Date()
    ) {
      if (session?.status === 'ACTIVE') {
        await this.revokeFamily(payload.sub, payload.familyId, 'refresh_reuse_or_invalid');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: SELECT_USER });
    if (!user || this.isBlocked(user.status) || user.status !== 'ACTIVE') {
      await this.revokeFamily(payload.sub, payload.familyId, 'account_status');
      throw new ForbiddenException(ACCOUNT_BLOCKED);
    }

    await this.revokeFamily(user.id, payload.familyId, 'rotated');

    return this.createSessionPair(user, ip, userAgent);
  }

  async logout(userId: string, familyId?: string) {
    if (familyId) {
      await this.revokeFamily(userId, familyId, 'logout');
      return { success: true };
    }

    await this.prisma.session.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: {
        status: 'LOGGED_OUT',
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SELECT_USER,
    });
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (this.isBlocked(user.status) || user.status !== 'ACTIVE') {
      throw new ForbiddenException(ACCOUNT_BLOCKED);
    }
    return user;
  }

  async assertAccessSession(userId: string, sessionId: string, accessToken: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (
      !session ||
      session.userId !== userId ||
      session.status !== 'ACTIVE' ||
      session.tokenType !== 'ACCESS' ||
      session.tokenSha256 !== sha256(accessToken) ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    const meta = session.metadata as { familyId?: string } | null;
    return { familyId: meta?.familyId };
  }

  private async createSessionPair<T extends { id: string; email: string }>(
    user: T,
    ip: string,
    userAgent?: string,
  ) {
    const familyId = crypto.randomUUID();
    const now = new Date();
    const accessTtl = parseDurationToMs(this.configService.get<string>('JWT_EXPIRES_IN', '15m'));
    const refreshTtl = parseDurationToMs(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    );

    const accessSession = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenSha256: sha256(`pending-access-${familyId}`),
        tokenType: 'ACCESS',
        status: 'ACTIVE',
        ipAddress: ip,
        userAgent: userAgent || null,
        expiresAt: new Date(now.getTime() + accessTtl),
        metadata: { familyId },
      },
    });
    const refreshSession = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenSha256: sha256(`pending-refresh-${familyId}`),
        tokenType: 'REFRESH',
        status: 'ACTIVE',
        ipAddress: ip,
        userAgent: userAgent || null,
        expiresAt: new Date(now.getTime() + refreshTtl),
        metadata: { familyId },
      },
    });

    const tokens = this.signTokenPair({
      userId: user.id,
      email: user.email,
      accessSessionId: accessSession.id,
      refreshSessionId: refreshSession.id,
      familyId,
    });

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: accessSession.id },
        data: { tokenSha256: sha256(tokens.accessToken), lastUsedAt: now },
      }),
      this.prisma.session.update({
        where: { id: refreshSession.id },
        data: { tokenSha256: sha256(tokens.refreshToken), lastUsedAt: now },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: Math.floor(accessTtl / 1000),
      user,
    };
  }

  private isBlocked(status: string) {
    return (BLOCKED_USER_STATUSES as readonly string[]).includes(status);
  }

  private refreshSecret() {
    return (
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      this.configService.get<string>('JWT_SECRET', 'dev-secret')
    );
  }

  private signTokenPair(input: {
    userId: string;
    email: string;
    accessSessionId: string;
    refreshSessionId: string;
    familyId: string;
  }) {
    const accessToken = this.jwtService.sign({
      sub: input.userId,
      email: input.email,
      sid: input.accessSessionId,
      familyId: input.familyId,
      typ: 'access',
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: input.userId,
        email: input.email,
        sid: input.refreshSessionId,
        familyId: input.familyId,
        typ: 'refresh',
      },
      {
        secret: this.refreshSecret(),
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      },
    );

    return { accessToken, refreshToken };
  }

  private async revokeFamily(userId: string, familyId: string, reason: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    const ids = sessions
      .filter((row) => {
        const meta = row.metadata as { familyId?: string } | null;
        return meta?.familyId === familyId;
      })
      .map((row) => row.id);

    if (ids.length === 0) {
      return;
    }

    await this.prisma.session.updateMany({
      where: { id: { in: ids } },
      data: {
        status: reason === 'logout' ? 'LOGGED_OUT' : 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }
}
