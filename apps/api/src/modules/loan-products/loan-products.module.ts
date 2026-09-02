import { Module } from '@nestjs/common';
import { LoanProductsService } from './loan-products.service';
import { LoanProductsController } from './loan-products.controller';

@Module({
  controllers: [LoanProductsController],
  providers: [LoanProductsService],
  exports: [LoanProductsService],
})
export class LoanProductsModule {}
