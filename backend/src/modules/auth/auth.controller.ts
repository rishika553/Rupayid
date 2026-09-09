import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { RequestOtpDto, VerifyOtpDto, RefreshSessionDto } from './dto/otp-auth.dto';
import { OtpAuthService } from './otp-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpAuthService: OtpAuthService,
  ) {}

  @Post('request-otp')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a login OTP over SMS' })
  async requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.otpAuthService.requestOtp(dto.phone, clientIp(req), req.headers['user-agent'], {
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: dto.name,
    });
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP and create a customer session' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.otpAuthService.verifyOtp(
      dto.phone,
      dto.otp,
      dto.otpRequestId,
      clientIp(req),
      req.headers['user-agent'],
      dto.referralCode,
      { firstName: dto.firstName, lastName: dto.lastName, name: dto.name },
    );
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

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Staff email/password login' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Email/password registration' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
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
