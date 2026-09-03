import { Injectable, Logger } from '@nestjs/common';
import type { SendOtpInput, SendOtpResult, SmsProvider } from './sms-provider';

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger('MockSmsProvider');
  private lastSent: Omit<SendOtpInput, 'otp'> & { sentAt: string } | null = null;

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const masked = maskPhone(input.to);
    this.lastSent = { to: input.to, templateId: input.templateId, sentAt: new Date().toISOString() };
    this.logger.log(`OTP SMS queued for ${masked} via mock provider`);
    return { providerMessageId: `mock-${Date.now()}` };
  }

  getLastRecipient(): string | null {
    return this.lastSent?.to ?? null;
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 4) {
    return '****';
  }
  return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
}
