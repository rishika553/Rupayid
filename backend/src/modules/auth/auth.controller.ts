import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { GoogleAuthDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { RefreshSessionDto } from './dto/otp-auth.dto';
import { OtpAuthService } from './otp-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpAuthService: OtpAuthService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginWithPassword(dto.email, dto.password, clientIp(req), req.headers['user-agent']);
  }

  @Post('register')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a customer account' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, clientIp(req), req.headers['user-agent']);
  }

  @Post('google')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in or create an account with Google' })
  async google(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.authService.loginWithGoogle(dto, clientIp(req), req.headers['user-agent']);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(@Body() dto: RefreshSessionDto, @Req() req: Request) {
    return this.otpAuthService.refresh(dto.refreshToken, clientIp(req), req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current customer session' })
  async logout(@CurrentUser() user: CurrentUserPayload) {
    return this.otpAuthService.logout(user.id, user.familyId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.otpAuthService.getMe(user.id);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
