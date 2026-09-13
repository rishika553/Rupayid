import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentAdmin } from './current-admin.decorator';
import type { CurrentAdminPayload } from './current-admin.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('admin-auth')
@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin portal username/password login' })
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuthService.login(dto.username, dto.password, clientIp(req), req.headers['user-agent']);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current admin profile' })
  async me(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminAuthService.getMe(admin.id);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current admin session' })
  async logout(@CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminAuthService.logout(admin);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
