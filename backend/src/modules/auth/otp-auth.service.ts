import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashOtp, parseDurationToMs, sha256, timingSafeEqualHex } from './crypto.util';
import {
  ACCOUNT_BLOCKED,
  BLOCKED_USER_STATUSES,
  GENERIC_OTP_INVALID,
  GENERIC_OTP_SENT,
  OTP_CONFIG,
} from './otp.constants';
import { OtpGenerator } from './otp-generator';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { maskPhone, normalizeIndianMobile } from './phone.util';
import { SMS_PROVIDER } from './sms/sms-provider';
import type { SmsProvider } from './sms/sms-provider';
import { ReferralsService } from '../referrals/referrals.service';

const SELECT_USER = {
  id: true,
  email: true,
  phoneNumber: true,
  phoneVerified: true,
  firstName: true,
  lastName: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class OtpAuthService {
  private readonly logger = new Logger('OtpAuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpGenerator: OtpGenerator,
    private readonly rateLimit: OtpRateLimitService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    private readonly referrals: ReferralsService,
  ) {}

  async requestOtp(rawPhone: string, ip: string, userAgent?: string) {
    const phone = normalizeIndianMobile(rawPhone);
    await this.rateLimit.assertWithinLimit(
      `otp:req:ip:${ip}`,
      OTP_CONFIG.requestPerIp.max,
      OTP_CONFIG.requestPerIp.windowMs,
    );

    const user = await this.findOrCreateCustomer(phone, ip, userAgent);
    if (this.isBlocked(user.status)) {
      this.logger.warn(`OTP request skipped for blocked account ${maskPhone(phone)}`);
      return this.genericRequestResponse();
    }

    const latest = await this.prisma.otpRequest.findFirst({
      where: { userId: user.id, purpose: 'LOGIN', status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (latest?.cooldownUntil && latest.cooldownUntil > new Date()) {
      throw new HttpException('Please wait before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.rateLimit.assertWithinLimit(
      `otp:req:phone:${phone}`,
      OTP_CONFIG.requestPerPhone.max,
      OTP_CONFIG.requestPerPhone.windowMs,
    );

    await this.prisma.otpRequest.updateMany({
      where: { userId: user.id, purpose: 'LOGIN', status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const otp = this.otpGenerator.generate();
    const pepper = this.otpPepper();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_CONFIG.expiryMs);
    const cooldownUntil = new Date(now.getTime() + OTP_CONFIG.resendCooldownMs);

    const row = await this.prisma.otpRequest.create({
      data: {
        userId: user.id,
        otpHash: hashOtp(pepper, phone, otp),
        purpose: 'LOGIN',
        channel: 'SMS',
        target: phone,
        status: 'ACTIVE',
        expiresAt,
        cooldownUntil,
        attempts: 0,
        maxAttempts: OTP_CONFIG.maxAttempts,
        metadata: { ip, userAgent: userAgent || null },
      },
    });

    try {
      await this.sms.sendOtp({ to: phone, otp });
    } catch {
      await this.prisma.otpRequest.update({
        where: { id: row.id },
        data: { status: 'CANCELLED' },
      });
      throw new ServiceUnavailableException('Unable to send OTP. Try again later.');
    }

    this.logger.log(`OTP request ${row.id} created for ${maskPhone(phone)}`);

    return {
      otpRequestId: row.id,
      expiresAt: expiresAt.toISOString(),
      cooldownSeconds: Math.floor(OTP_CONFIG.resendCooldownMs / 1000),
      message: GENERIC_OTP_SENT,
    };
  }

  async verifyOtp(
    rawPhone: string,
    otp: string,
    otpRequestId: string,
    ip: string,
    userAgent?: string,
    referralCode?: string,
  ) {
    const phone = normalizeIndianMobile(rawPhone);

    await this.rateLimit.assertWithinLimit(
      `otp:ver:ip:${ip}`,
      OTP_CONFIG.verifyPerIp.max,
      OTP_CONFIG.verifyPerIp.windowMs,
    );
    await this.rateLimit.assertWithinLimit(
      `otp:ver:phone:${phone}`,
      OTP_CONFIG.verifyPerPhone.max,
      OTP_CONFIG.verifyPerPhone.windowMs,
    );

    const request = await this.prisma.otpRequest.findUnique({ where: { id: otpRequestId } });
    if (!request || request.target !== phone) {
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }

    const user = await this.prisma.user.findUnique({ where: { id: request.userId } });
    if (!user) {
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }
    if (this.isBlocked(user.status)) {
      throw new ForbiddenException(ACCOUNT_BLOCKED);
    }

    if (request.status !== 'ACTIVE') {
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }

    if (request.expiresAt <= new Date()) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }

    if (request.attempts >= request.maxAttempts) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { status: 'LOCKED' },
      });
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }

    const expected = hashOtp(this.otpPepper(), phone, otp);
    const matches = timingSafeEqualHex(expected, request.otpHash);

    if (!matches) {
      const attempts = request.attempts + 1;
      const locked = attempts >= request.maxAttempts;
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: {
          attempts,
          status: locked ? 'LOCKED' : 'ACTIVE',
        },
      });
      throw new UnauthorizedException(GENERIC_OTP_INVALID);
    }

    const firstVerification = !user.phoneVerified;
    const familyId = crypto.randomUUID();
    const now = new Date();
    const accessTtl = parseDurationToMs(this.configService.get<string>('JWT_EXPIRES_IN', '15m'));
    const refreshTtl = parseDurationToMs(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    );

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          lastLoginAt: now,
          status: user.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : user.status,
        },
        select: SELECT_USER,
      }),
      this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { status: 'USED', consumedAt: now },
      }),
    ]);

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

    this.logger.log(`OTP verified for ${maskPhone(phone)} session family ${familyId}`);

    await this.referrals.applyAtFirstVerification({
      refereeId: user.id,
      rawCode: referralCode,
      firstVerification,
      ip,
      userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: Math.floor(accessTtl / 1000),
      user: updatedUser,
    };
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

  private genericRequestResponse() {
    return {
      otpRequestId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + OTP_CONFIG.expiryMs).toISOString(),
      cooldownSeconds: Math.floor(OTP_CONFIG.resendCooldownMs / 1000),
      message: GENERIC_OTP_SENT,
    };
  }

  private isBlocked(status: string) {
    return (BLOCKED_USER_STATUSES as readonly string[]).includes(status);
  }

  private otpPepper() {
    return this.configService.get<string>('OTP_PEPPER') || 'dev-otp-pepper';
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

  private async findOrCreateCustomer(phone: string, ip?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({ where: { phoneNumber: phone } });
    if (existing) {
      if (!existing.referralCode) {
        await this.referrals.provisionForUser(existing.id, ip, userAgent);
      }
      return existing;
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const digits = phone.replace(/\D/g, '');
    const borrower = await this.prisma.role.findUnique({ where: { name: 'BORROWER' } });

    const created = await this.prisma.user.create({
      data: {
        email: `otp.${digits}@users.rupayaid.internal`,
        passwordHash,
        firstName: 'Customer',
        lastName: digits.slice(-4),
        phoneNumber: phone,
        phoneVerified: false,
        status: 'PENDING_VERIFICATION',
        roles: borrower
          ? {
              create: [{ roleId: borrower.id }],
            }
          : undefined,
      },
    });
    await this.referrals.provisionForUser(created.id, ip, userAgent);
    return created;
  }
}
