import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  digimilesOtpMessage,
  digimilesTemplateId,
  readDigimilesCredentials,
  sendDigimilesSms,
} from '../../../common/sms/digimiles.client';
import type {
  NotificationDeliveryInput,
  NotificationDeliveryResult,
  NotificationProvider,
} from './notification-provider';

@Injectable()
export class DigimilesNotificationProvider implements NotificationProvider {
  readonly name = 'digimiles';
  private readonly logger = new Logger('DigimilesNotificationProvider');

  constructor(private readonly config: ConfigService) {}

  async send(input: NotificationDeliveryInput): Promise<NotificationDeliveryResult> {
    const credentials = readDigimilesCredentials(this.config);
    const templateId = digimilesTemplateId(this.config, input.eventType);
    if (!credentials || !templateId) {
      this.logger.error(`Digimiles is not configured for ${input.eventType}`);
      throw new ServiceUnavailableException('SMS provider is unavailable');
    }

    const message =
      input.eventType === 'OTP'
        ? digimilesOtpMessage(this.config, input.variables.otp || '')
        : input.body;

    return sendDigimilesSms({
      credentials,
      to: input.to,
      templateId,
      message,
    });
  }
}
