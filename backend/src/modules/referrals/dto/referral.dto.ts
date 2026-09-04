import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class ValidateReferralDto {
  @ApiProperty({ example: 'RAP-A1B2C3D4' })
  @IsString()
  @MaxLength(16)
  @Matches(/^RAP-[A-Z0-9]{8}$/i, { message: 'Enter a valid referral code' })
  code!: string;
}
