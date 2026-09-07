import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationQueueService } from './notification-queue.service';
import {
  EMAIL_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
} from './providers/notification-provider';
import { DigimilesNotificationProvider } from './providers/digimiles-notification.provider';
import { MockSmsNotificationProvider } from './providers/mock-sms-notification.provider';
import { ResendNotificationProvider } from './providers/resend-notification.provider';
import { shouldUseDigimiles } from '../../common/sms/digimiles.client';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueueService,
    {
      provide: SMS_NOTIFICATION_PROVIDER,
      useFactory: (config: ConfigService) =>
        shouldUseDigimiles(config)
          ? new DigimilesNotificationProvider(config)
          : new MockSmsNotificationProvider(),
      inject: [ConfigService],
    },
    {
      provide: EMAIL_NOTIFICATION_PROVIDER,
      useFactory: (config: ConfigService) => new ResendNotificationProvider(config),
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
