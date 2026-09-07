import type { Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { shouldUseDigimiles } from '../../../common/sms/digimiles.client';
import { SMS_PROVIDER } from './sms-provider';
import { MockSmsProvider } from './mock-sms.provider';
import { DigimilesSmsProvider } from './digimiles-sms.provider';

const smsProvider: Provider = {
  provide: SMS_PROVIDER,
  useFactory: (configService: ConfigService) => {
    if (shouldUseDigimiles(configService)) {
      return new DigimilesSmsProvider(configService);
    }
    return new MockSmsProvider();
  },
  inject: [ConfigService],
};

@Module({
  providers: [smsProvider],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
