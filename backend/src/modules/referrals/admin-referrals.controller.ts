import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';
import { AdminReferralQueryDto, UpdateReferralStatusDto } from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

// The global AdminAuthGuard requires a live admin session for /api/admin/*.
@ApiTags('admin-referrals')
@ApiBearerAuth()
@Controller('api/admin/referrals')
export class AdminReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  list(@Query() query: AdminReferralQueryDto) {
    return this.referrals.listAdmin(query);
  }

  @Patch(':id/status')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReferralStatusDto,
    @CurrentAdmin() admin: CurrentAdminPayload) {
    return this.referrals.updateStatus(id, dto, admin.userId);
  }
}
