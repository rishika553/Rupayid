import { Module } from '@nestjs/common';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { LoansModule } from '../loans/loans.module';
import { RepaymentsModule } from '../repayments/repayments.module';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOpsService } from './admin-ops.service';

@Module({
  imports: [LoansModule, DisbursementsModule, RepaymentsModule],
  controllers: [AdminOpsController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}
