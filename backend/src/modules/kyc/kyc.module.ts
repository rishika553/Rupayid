import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [FilesModule, AuditModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
