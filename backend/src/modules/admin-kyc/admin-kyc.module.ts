import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { AdminOpsModule } from '../admin-ops/admin-ops.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminKycController } from './admin-kyc.controller';
import { AdminKycService } from './admin-kyc.service';

@Module({
  imports: [AuditModule, FilesModule, AdminOpsModule],
  controllers: [AdminDashboardController, AdminKycController],
  providers: [AdminKycService],
})
export class AdminKycModule {}
