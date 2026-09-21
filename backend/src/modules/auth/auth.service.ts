import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { ReferralsService } from '../referrals/referrals.service';
import { OtpAuthService } from './otp-auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { verifyGoogleIdToken } from './google-id-token';
import { sha256 } from './crypto.util';
import { parseCorsOrigins } from '../../common/config/app.config';
import type { GoogleAuthDto, RegisterDto } from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly referrals: ReferralsService,
    private readonly sessions: OtpAuthService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async loginWithPassword(email: string, password: string, ip: string, userAgent?: string) {
    const user = await this.userService.findByEmail(email.trim().toLowerCase());
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.sessions.issueCustomerSession(user.id, ip, userAgent);
  }

  async register(dto: RegisterDto, ip: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userService.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.userService.create({
      email,
      passwordHash: hashedPassword,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
    });

    await this.referrals.provisionForUser(user.id, ip, userAgent);
    await this.referrals.applyAtFirstVerification({
      refereeId: user.id,
      rawCode: dto.referralCode,
      firstVerification: true,
      ip,
      userAgent,
    });

    return this.sessions.issueCustomerSession(user.id, ip, userAgent);
  }

  async loginWithGoogle(dto: GoogleAuthDto, ip: string, userAgent?: string) {
    const clientId = (
      this.config.get<string>('GOOGLE_CLIENT_ID') ||
      this.config.get<string>('jwt.googleClientId') ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
    ).trim();
    if (!clientId) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }

    const identity = await verifyGoogleIdToken(dto.idToken, clientId);
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: identity.googleId }, { email: identity.email }],
      },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = await this.prisma.user.create({
        data: {
          email: identity.email,
          emailVerified: true,
          googleId: identity.googleId,
          passwordHash,
          firstName: identity.firstName,
          lastName: identity.lastName,
          status: 'ACTIVE',
        },
      });
      await this.referrals.provisionForUser(user.id, ip, userAgent);
      await this.referrals.applyAtFirstVerification({
        refereeId: user.id,
        rawCode: dto.referralCode,
        firstVerification: true,
        ip,
        userAgent,
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: identity.googleId,
          emailVerified: true,
        },
      });
    }

    return this.sessions.issueCustomerSession(user.id, ip, userAgent);
  }

  async getProfile(userId: string) {
    return this.userService.findById(userId);
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email.trim().toLowerCase());
    if (user?.passwordHash) {
      await this.prisma.otpRequest.updateMany({
        where: { userId: user.id, purpose: 'PASSWORD_RESET', status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
      const token = crypto.randomBytes(32).toString('hex');
      await this.prisma.otpRequest.create({
        data: {
          userId: user.id,
          otpHash: sha256(token),
          purpose: 'PASSWORD_RESET',
          channel: 'EMAIL',
          target: user.email,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          maxAttempts: 5,
        },
      });
      const appUrl = parseCorsOrigins(process.env.CORS_ORIGIN)[0];
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await this.notifications.publish({
        eventType: 'PASSWORD_RESET',
        userId: user.id,
        destination: user.email,
        variables: { resetUrl },
      });
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Password reset link for ${user.email}: ${resetUrl}`);
      }
    }
    return { message: 'If that email is registered, we sent a reset link.' };
  }

  async resetPassword(token: string, password: string) {
    const hashed = sha256(token.trim());
    const request = await this.prisma.otpRequest.findFirst({
      where: { otpHash: hashed, purpose: 'PASSWORD_RESET', status: 'ACTIVE' },
    });
    if (!request || request.expiresAt < new Date()) {
      if (request) {
        await this.prisma.otpRequest.update({
          where: { id: request.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    if (request.attempts >= request.maxAttempts) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' },
      });
      throw new BadRequestException('This reset link is no longer valid.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { passwordHash },
      }),
      this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { status: 'USED', consumedAt: new Date(), attempts: { increment: 1 } },
      }),
      this.prisma.session.deleteMany({ where: { userId: request.userId } }),
    ]);
    return { message: 'Password updated. Sign in with your new password.' };
  }
}
