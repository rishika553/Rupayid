import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  digimilesOtpMessage,
  digimilesTemplateId,
  readDigimilesCredentials,
  sendDigimilesSms,
} from '../../../common/sms/digimiles.client';
import type { SendOtpInput, SendOtpResult, SmsProvider } from './sms-provider';

@Injectable()
export class DigimilesSmsProvider implements SmsProvider {
  private readonly logger = new Logger('DigimilesSmsProvider');

  constructor(private readonly config: ConfigService) {}

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const credentials = readDigimilesCredentials(this.config);
    const templateId = input.templateId || digimilesTemplateId(this.config, 'OTP');
    if (!credentials || !templateId) {
      this.logger.error('Digimiles is not configured');
      throw new ServiceUnavailableException('SMS provider is unavailable');
    }

    return sendDigimilesSms({
      credentials,
      to: input.to,
      templateId,
      message: digimilesOtpMessage(this.config, input.otp),
    });
  }
}
