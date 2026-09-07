import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OTP_CONFIG } from './otp.constants';

@Injectable()
export class OtpGenerator {
  constructor(private readonly config: ConfigService) {}

  generate(): string {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      return this.config.get<string>('DEV_OTP_CODE') || '123456';
    }
    const max = 10 ** OTP_CONFIG.length;
    return crypto.randomInt(0, max).toString().padStart(OTP_CONFIG.length, '0');
  }
}
