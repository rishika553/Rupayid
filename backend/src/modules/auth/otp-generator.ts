import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { OTP_CONFIG } from './otp.constants';

@Injectable()
export class OtpGenerator {
  generate(): string {
    const max = 10 ** OTP_CONFIG.length;
    return crypto.randomInt(0, max).toString().padStart(OTP_CONFIG.length, '0');
  }
}
