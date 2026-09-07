import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LoanProductsModule } from '../loan-products/loan-products.module';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';

@Module({
  imports: [AuditModule, LoanProductsModule],
  controllers: [EligibilityController],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}
