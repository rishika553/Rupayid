import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider';
import { RazorpayProvider } from './providers/razorpay.provider';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = new RazorpayProvider(config);
        const testMode = provider.isTestMode();
        const logger = new Logger('Payments');
        if (testMode === null) {
          logger.warn('Razorpay is not configured; customer repayments are disabled');
        } else {
          logger.log(`Razorpay configured in ${testMode ? 'TEST' : 'LIVE'} mode`);
          if (!config.get<string>('RAZORPAY_KEY_SECRET')) {
            logger.warn('RAZORPAY_KEY_SECRET is missing; payment orders will fail');
          }
          if (!config.get<string>('RAZORPAY_WEBHOOK_SECRET')) {
            logger.warn('RAZORPAY_WEBHOOK_SECRET is missing; webhooks will be rejected');
          }
        }
        return provider;
      },
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
