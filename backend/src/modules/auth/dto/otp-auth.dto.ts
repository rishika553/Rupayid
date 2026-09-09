import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Enter a valid Indian mobile number' })
  phone!: string;

  @ApiProperty({ required: false, example: 'Ria' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Shah' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ required: false, example: 'Ria Shah' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  name?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Enter a valid Indian mobile number' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  otpRequestId!: string;

  @ApiProperty({ required: false, example: 'RAP-A1B2C3D4' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Matches(/^RAP-[A-Z0-9]{8}$/i, { message: 'Enter a valid referral code' })
  referralCode?: string;

  @ApiProperty({ required: false, example: 'Ria' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Shah' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ required: false, example: 'Ria Shah' })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(1, 80)
  name?: string;
}

export class RefreshSessionDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
