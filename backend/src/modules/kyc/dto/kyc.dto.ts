import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertKycDetailsDto {
  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$|^\+91[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' })
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fatherOrSpouseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  residenceType?: string;

  @ApiPropertyOptional({ description: 'Last 4 of PAN only' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  panLastFour?: string;

  @ApiPropertyOptional({ description: 'Last 4 of Aadhaar only' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  aadhaarLastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  idDocumentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'Last 4 of account only' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  accountLastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Enter a valid IFSC' })
  ifsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  accountType?: string;
}

const KYC_DOCUMENT_TYPES = [
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'PAN_CARD',
  'AADHAAR_CARD',
  'UTILITY_BILL',
  'BANK_STATEMENT',
  'INCOME_PROOF',
  'SELFIE',
  'OTHERS',
] as const;

export class RequestKycUploadDto {
  @ApiProperty({ example: 'AADHAAR_CARD' })
  @IsIn(KYC_DOCUMENT_TYPES)
  documentType!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @ApiProperty({ example: 120000 })
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  fileSizeBytes!: number;
}

export class ConfirmKycDocumentDto {
  @ApiProperty({ example: 'AADHAAR_CARD' })
  @IsIn(KYC_DOCUMENT_TYPES)
  documentType!: string;

  @ApiProperty()
  @IsString()
  objectKey!: string;

  @ApiProperty()
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  fileSizeBytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileSha256?: string;
}
