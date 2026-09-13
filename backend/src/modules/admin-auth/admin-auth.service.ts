import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseDurationToMs, sha256 } from '../auth/crypto.util';
import { OtpRateLimitService } from '../auth/otp-rate-limit.service';
import {
  ADMIN_ACCOUNT_DISABLED,
  ADMIN_AUTH_AUDIENCE,
  ADMIN_AUTH_TYP,
  ADMIN_LOGIN_RATE,
  GENERIC_ADMIN_LOGIN_FAILED,
} from './admin-auth.constants';
import type { CurrentAdminPayload } from './current-admin.decorator';

const ADMIN_SAFE_SELECT = {
  id: true,
  userId: true,
  username: true,
  status: true,
  passwordHash: true,
} as const;

/** Well-formed bcrypt hash used only to keep failed lookups from short-circuiting. */
const DUMMY_PASSWORD_HASH = '$2a$04$ApZG/R4w6E8UtaTgrhF4f.Oa89R6Rg/wna4cQUdPT0eGpsyelbi8O';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger('AdminAuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rateLimit: OtpRateLimitService,
    private readonly audit: AuditService,
  ) {}

  async login(usernameInput: string, password: string, ip: string, userAgent?: string) {
    const username = usernameInput.trim();
    await this.rateLimit.assertWithinLimit(
      `admin:login:ip:${ip}`,
      ADMIN_LOGIN_RATE.perIp.max,
      ADMIN_LOGIN_RATE.perIp.windowMs,
    );
    await this.rateLimit.assertWithinLimit(
      `admin:login:user:${username.toLowerCase()}`,
      ADMIN_LOGIN_RATE.perUsername.max,
      ADMIN_LOGIN_RATE.perUsername.windowMs,
    );

    const admin = await this.prisma.adminUser.findUnique({
      where: { username },
      select: ADMIN_SAFE_SELECT,
    });

    const hash = admin?.passwordHash || DUMMY_PASSWORD_HASH;
    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(password, hash);
    } catch {
      passwordOk = false;
    }

    if (!admin || !admin.username || !admin.passwordHash || !passwordOk) {
      this.logger.warn(`Admin login failed for username=${username}`);
      throw new UnauthorizedException(GENERIC_ADMIN_LOGIN_FAILED);
    }

    if (admin.status !== 'ACTIVE') {
      this.logger.warn(`Admin login blocked for disabled account id=${admin.id}`);
      throw new ForbiddenException(ADMIN_ACCOUNT_DISABLED);
    }

    const familyId = crypto.randomUUID();
    const now = new Date();
    const accessTtl = parseDurationToMs(this.configService.get<string>('JWT_EXPIRES_IN', '15m'));

    const session = await this.prisma.session.create({
      data: {
        userId: admin.userId,
        tokenSha256: sha256(`pending-admin-access-${familyId}`),
        tokenType: 'ACCESS',
        status: 'ACTIVE',
        ipAddress: ip,
        userAgent: userAgent || null,
        expiresAt: new Date(now.getTime() + accessTtl),
        metadata: {
          familyId,
          audience: ADMIN_AUTH_AUDIENCE,
          adminUserId: admin.id,
        },
      },
    });

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
      sid: session.id,
      familyId,
      typ: ADMIN_AUTH_TYP,
      aud: ADMIN_AUTH_AUDIENCE,
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenSha256: sha256(accessToken), lastUsedAt: now },
    });

    this.logger.log(`Admin login succeeded id=${admin.id}`);

    await this.audit.log({
      actionType: 'ADMIN_LOGIN',
      entityType: 'AdminUser',
      entityId: admin.id,
      eventCategory: 'ADMIN',
      changedById: admin.userId,
      isActorAdmin: true,
      message: 'Admin signed in',
      ipAddress: ip,
      userAgent,
      metadata: {
        adminUserId: admin.id,
        action: 'ADMIN_LOGIN',
      },
    });

    return {
      accessToken,
      expiresIn: Math.floor(accessTtl / 1000),
      admin: this.toPublicAdmin(admin),
    };
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, status: true },
    });
    if (!admin || !admin.username) {
      throw new UnauthorizedException('Authentication required');
    }
    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException(ADMIN_ACCOUNT_DISABLED);
    }
    return { id: admin.id, username: admin.username, status: admin.status };
  }

  async logout(admin: CurrentAdminPayload) {
    if (admin.familyId) {
      await this.revokeAdminFamily(admin.userId, admin.id, admin.familyId, 'logout');
    } else {
      const sessions = await this.prisma.session.findMany({
        where: { userId: admin.userId, status: 'ACTIVE', tokenType: 'ACCESS' },
      });
      const ids = sessions
        .filter((row: { id: string; metadata: unknown }) => {
          const meta = row.metadata as { audience?: string; adminUserId?: string } | null;
          return meta?.audience === ADMIN_AUTH_AUDIENCE && meta.adminUserId === admin.id;
        })
        .map((row: { id: string }) => row.id);

      if (ids.length > 0) {
        await this.prisma.session.updateMany({
          where: { id: { in: ids } },
          data: {
            status: 'LOGGED_OUT',
            revokedAt: new Date(),
            revokedReason: 'logout',
          },
        });
      }
    }

    await this.audit.log({
      actionType: 'ADMIN_LOGOUT',
      entityType: 'AdminUser',
      entityId: admin.id,
      eventCategory: 'ADMIN',
      changedById: admin.userId,
      isActorAdmin: true,
      message: 'Admin signed out',
      metadata: {
        adminUserId: admin.id,
        action: 'ADMIN_LOGOUT',
      },
    });

    return { success: true };
  }

  async assertAdminAccess(adminUserId: string, sessionId: string, accessToken: string): Promise<CurrentAdminPayload> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { id: true, userId: true, username: true, status: true },
    });
    if (!admin || !admin.username) {
      throw new UnauthorizedException('Authentication required');
    }
    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException(ADMIN_ACCOUNT_DISABLED);
    }

    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    const meta = (session?.metadata as { familyId?: string; audience?: string; adminUserId?: string } | null) ?? null;
    if (
      !session ||
      session.userId !== admin.userId ||
      session.status !== 'ACTIVE' ||
      session.tokenType !== 'ACCESS' ||
      session.tokenSha256 !== sha256(accessToken) ||
      session.expiresAt <= new Date() ||
      meta?.audience !== ADMIN_AUTH_AUDIENCE ||
      meta.adminUserId !== admin.id
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: admin.id,
      username: admin.username,
      status: admin.status,
      userId: admin.userId,
      sid: session.id,
      familyId: meta.familyId,
      typ: ADMIN_AUTH_TYP,
    };
  }

  private async revokeAdminFamily(userId: string, adminUserId: string, familyId: string, reason: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    const ids = sessions
      .filter((row: { id: string; metadata: unknown }) => {
        const meta = row.metadata as { familyId?: string; audience?: string; adminUserId?: string } | null;
        return (
          meta?.familyId === familyId &&
          meta.audience === ADMIN_AUTH_AUDIENCE &&
          meta.adminUserId === adminUserId
        );
      })
      .map((row: { id: string }) => row.id);

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

  private toPublicAdmin(admin: { id: string; username: string | null; status: string }) {
    return {
      id: admin.id,
      username: admin.username as string,
      status: admin.status,
    };
  }
}
