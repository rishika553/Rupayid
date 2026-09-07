import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FilesModule, AuditModule, NotificationsModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
