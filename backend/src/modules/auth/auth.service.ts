import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { ReferralsService } from '../referrals/referrals.service';
import { OtpAuthService } from './otp-auth.service';
import { verifyGoogleIdToken } from './google-id-token';
import type { GoogleAuthDto, RegisterDto } from './dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly referrals: ReferralsService,
    private readonly sessions: OtpAuthService,
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
      phoneNumber: dto.phoneNumber?.trim() || undefined,
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
}
