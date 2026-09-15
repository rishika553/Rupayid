import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOpsService } from '../admin-ops/admin-ops.service';
import { AdminKycService } from './admin-kyc.service';

@ApiTags('admin-kyc')
@ApiBearerAuth()
@Controller('api/admin/dashboard')
export class AdminDashboardController {
  constructor(
    private readonly adminKycService: AdminKycService,
    private readonly adminOpsService: AdminOpsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard counts' })
  async getStats() {
    const [kyc, ops] = await Promise.all([this.adminKycService.getStats(), this.adminOpsService.getOpsStats()]);
    return { ...kyc, ...ops };
  }
}
