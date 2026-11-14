import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { clientIp } from '../../common/http/client-ip';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ReferralListQueryDto, SubmitReferralDto, ValidateReferralDto } from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiBearerAuth()
  submit(@CurrentUser() user: CurrentUserPayload, @Body() dto: SubmitReferralDto) {
    return this.referralsService.submit(user.id, dto);
  }

  @Get('history')
  @ApiBearerAuth()
  history(@CurrentUser() user: CurrentUserPayload, @Query() query: ReferralListQueryDto) {
    return this.referralsService.listMine(user.id, query);
  }

  @Get('statistics')
  @ApiBearerAuth()
  statistics(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.statistics(user.id);
  }

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Check whether a referral code can be used at sign-up' })
  async validate(
    @Body() dto: ValidateReferralDto,
    @Req() req: Request,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.referralsService.validateCode(dto.code, clientIp(req), user?.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current customer referral code and relationships' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.getMine(user.id);
  }
}
