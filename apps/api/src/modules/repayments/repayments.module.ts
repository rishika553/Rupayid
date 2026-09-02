import { Module } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';

@Module({
  controllers: [RepaymentsController],
  providers: [RepaymentsService],
  exports: [RepaymentsService],
})
export class RepaymentsModule {}
