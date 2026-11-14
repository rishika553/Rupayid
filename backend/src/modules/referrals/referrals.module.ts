import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { AdminReferralsController } from './admin-referrals.controller';

@Module({
  imports: [AuditModule],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
