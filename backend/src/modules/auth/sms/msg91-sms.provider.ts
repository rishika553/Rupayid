import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { SendOtpInput, SendOtpResult, SmsProvider } from './sms-provider';

@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger('Msg91SmsProvider');

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY');
    const templateId =
      input.templateId || this.configService.get<string>('MSG91_TEMPLATE_ID');
    const sender = this.configService.get<string>('MSG91_SENDER_ID');

    if (!authKey || !templateId) {
      this.logger.error('MSG91 is not configured');
      throw new ServiceUnavailableException('SMS provider is unavailable');
    }

    const mobile = input.to.replace(/^\+/, '');
    const masked = `${input.to.slice(0, 4)}****${input.to.slice(-4)}`;

    try {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile,
          otp: input.otp,
          sender,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { request_id?: string; type?: string };

      if (!response.ok || body.type === 'error') {
        this.logger.error(`MSG91 rejected OTP send for ${masked} status=${response.status}`);
        throw new ServiceUnavailableException('SMS provider is unavailable');
      }

      return { providerMessageId: body.request_id || `msg91-${Date.now()}` };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`MSG91 request failed for ${masked}`);
      throw new ServiceUnavailableException('SMS provider is unavailable');
    }
  }
}
