import * as crypto from 'crypto';

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function parseDurationToMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}
