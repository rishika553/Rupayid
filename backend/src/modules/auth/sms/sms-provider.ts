export const SMS_PROVIDER = 'SMS_PROVIDER';

export interface SendOtpInput {
  to: string;
  otp: string;
  templateId?: string;
}

export interface SendOtpResult {
  providerMessageId: string;
}

export interface SmsProvider {
  sendOtp(input: SendOtpInput): Promise<SendOtpResult>;
}
