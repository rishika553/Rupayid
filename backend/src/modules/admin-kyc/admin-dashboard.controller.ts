import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminKycService } from './admin-kyc.service';

@ApiTags('admin-kyc')
@ApiBearerAuth()
@Controller('api/admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminKycService: AdminKycService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Phase 1 KYC dashboard counts' })
  getStats() {
    return this.adminKycService.getStats();
  }
}
