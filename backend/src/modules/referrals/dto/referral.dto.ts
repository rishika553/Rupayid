import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const CONTACT_STATUSES = ['PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED'] as const;
export const CONSENT_VERSION = 'referral-contact-v1';

export function normalizeIndianMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  return compact;
}

export class SubmitReferralDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @IsString()
  @Length(2, 100)
  @Matches(/^[\p{L}\p{M}][\p{L}\p{M} .'-]+$/u, { message: 'Enter a valid full name' })
  referredName!: string;

  @Transform(({ value }) => normalizeIndianMobile(value))
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  referredPhone!: string;

  // unknown deliberately prevents implicit conversion of the string "false" to true.
  @Equals(true, { message: 'Confirm the referred person agreed to sharing and contact' })
  consentConfirmed!: unknown;
}

export class ReferralListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;
}

export class AdminReferralQueryDto extends ReferralListQueryDto {
  @IsOptional() @IsIn(CONTACT_STATUSES)
  status?: typeof CONTACT_STATUSES[number];

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}

export class UpdateReferralStatusDto {
  @IsIn(CONTACT_STATUSES)
  status!: typeof CONTACT_STATUSES[number];
}

export class ValidateReferralDto {
  @ApiProperty({ example: 'RAP-A1B2C3D4' })
  @IsString()
  @MaxLength(16)
  @Matches(/^RAP-[A-Z0-9]{8}$/i, { message: 'Enter a valid referral code' })
  code!: string;
}
