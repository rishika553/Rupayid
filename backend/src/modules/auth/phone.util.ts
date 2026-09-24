import { BadRequestException } from '@nestjs/common';

const E164_IN = /^\+91[6-9]\d{9}$/;

export function normalizeIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  let e164: string;

  if (digits.length === 10) {
    e164 = `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    e164 = `+${digits}`;
  } else if (input.trim().startsWith('+') && E164_IN.test(input.trim())) {
    e164 = input.trim();
  } else {
    throw new BadRequestException('Enter a valid Indian mobile number');
  }

  if (!E164_IN.test(e164)) {
    throw new BadRequestException('Enter a valid Indian mobile number');
  }

  return e164;
}
