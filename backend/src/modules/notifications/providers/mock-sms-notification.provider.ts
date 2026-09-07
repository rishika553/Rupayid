import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationDeliveryInput,
  NotificationDeliveryResult,
  NotificationProvider,
} from './notification-provider';

@Injectable()
export class MockSmsNotificationProvider implements NotificationProvider {
  readonly name = 'mock-sms';
  private readonly logger = new Logger('MockSmsNotificationProvider');

  async send(input: NotificationDeliveryInput): Promise<NotificationDeliveryResult> {
    this.logger.log(`SMS queued for ${maskPhone(input.to)} event=${input.eventType}`);
    return { providerMessageId: `mock-${Date.now()}` };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 4) {
    return '****';
  }
  return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
}
