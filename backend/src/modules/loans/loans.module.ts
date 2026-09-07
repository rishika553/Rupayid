import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { LoanProductsModule } from '../loan-products/loan-products.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EligibilityModule, LoanProductsModule, AuditModule, NotificationsModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
