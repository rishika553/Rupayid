import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { ReferralsService } from './referrals.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('referrals')
@Controller('referrals')
@ApiBearerAuth()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a referral code' })
  async create(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.createReferral(user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my referrals' })
  async myReferrals(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.findByReferrer(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics' })
  async stats(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.getReferralStats(user.id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Look up referral by code' })
  async findByCode(@Param('code') code: string) {
    return this.referralsService.findByCode(code);
  }

  @Post('accept/:code')
  @ApiOperation({ summary: 'Accept a referral' })
  async accept(@Param('code') code: string, @CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.acceptReferral(code, user.id);
  }
}
