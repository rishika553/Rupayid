import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { clientIp } from '../../common/http/client-ip';
import { AUTH_RATE_LIMITS } from './auth.constants';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { RateLimitService } from './rate-limit.service';
import { SessionService } from './session.service';

type Limit = { max: number; windowMs: number };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = clientIp(req);
    await this.limit(`auth:login:ip:${ip}`, AUTH_RATE_LIMITS.loginPerIp);
    await this.limit(`auth:login:email:${normalizeEmail(dto.email)}`, AUTH_RATE_LIMITS.loginPerEmail);
    return this.authService.loginWithPassword(dto.email, dto.password, ip, req.headers['user-agent']);
  }

  @Post('register')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a customer account' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = clientIp(req);
    await this.limit(`auth:register:ip:${ip}`, AUTH_RATE_LIMITS.registerPerIp);
    return this.authService.register(dto, ip, req.headers['user-agent']);
  }

  @Post('google')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in or create an account with Google' })
  async google(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    const ip = clientIp(req);
    await this.limit(`auth:google:ip:${ip}`, AUTH_RATE_LIMITS.googlePerIp);
    return this.authService.loginWithGoogle(dto, ip, req.headers['user-agent']);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a password reset link if the account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.limit(`auth:forgot:ip:${clientIp(req)}`, AUTH_RATE_LIMITS.forgotPerIp);
    await this.limit(`auth:forgot:email:${normalizeEmail(dto.email)}`, AUTH_RATE_LIMITS.forgotPerEmail);
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.limit(`auth:reset:ip:${clientIp(req)}`, AUTH_RATE_LIMITS.resetPerIp);
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ip = clientIp(req);
    await this.limit(`auth:refresh:ip:${ip}`, AUTH_RATE_LIMITS.refreshPerIp);
    return this.sessionService.refresh(dto.refreshToken, ip, req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current customer session' })
  async logout(@CurrentUser() user: CurrentUserPayload) {
    return this.sessionService.logout(user.id, user.familyId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.sessionService.getMe(user.id);
  }

  private limit(key: string, { max, windowMs }: Limit) {
    return this.rateLimit.assertWithinLimit(key, max, windowMs);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
