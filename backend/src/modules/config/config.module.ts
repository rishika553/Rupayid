import { Module } from '@nestjs/common';
import { SystemConfigService } from './config.service';
import { SystemConfigController } from './config.controller';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
