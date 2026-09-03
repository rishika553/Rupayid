import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Enter a valid Indian mobile number' })
  phone!: string;
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
}

export class RefreshSessionDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
