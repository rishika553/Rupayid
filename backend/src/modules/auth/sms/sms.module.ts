import type { Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMS_PROVIDER } from './sms-provider';
import { MockSmsProvider } from './mock-sms.provider';
import { Msg91SmsProvider } from './msg91-sms.provider';

const smsProvider: Provider = {
  provide: SMS_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const env = configService.get<string>('NODE_ENV');
    const authKey = configService.get<string>('MSG91_AUTH_KEY');
    if (env === 'production' && authKey) {
      return new Msg91SmsProvider(configService);
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
