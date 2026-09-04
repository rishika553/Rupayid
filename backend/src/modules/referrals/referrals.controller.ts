import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ValidateReferralDto } from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Check whether a referral code can be used at sign-up' })
  async validate(@Body() dto: ValidateReferralDto, @Req() req: Request) {
    return this.referralsService.validateCode(dto.code, clientIp(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current customer referral code and relationships' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.getMine(user.id);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
