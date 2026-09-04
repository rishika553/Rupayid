import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const MARITAL = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const;
const RESIDENCE = ['OWNED', 'RENTED', 'FAMILY', 'COMPANY_PROVIDED'] as const;
const ID_TYPES = ['AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'] as const;
const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT'] as const;

function trimToUndefined({ value }: { value: unknown }) {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : undefined;
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsIn(GENDERS)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(120)
  fatherOrSpouseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsIn(MARITAL)
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsIn(RESIDENCE)
  residenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'Enter a valid yearly income' })
  yearlyIncome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @Length(4, 4)
  @Matches(/^[A-Za-z0-9]{4}$/)
  panLastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  aadhaarLastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsIn(ID_TYPES)
  idDocumentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(120)
  accountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  accountLastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    const cleaned = trimToUndefined({ value });
    return typeof cleaned === 'string' ? cleaned.toUpperCase() : cleaned;
  })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Enter a valid IFSC' })
  ifsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimToUndefined)
  @IsIn(ACCOUNT_TYPES)
  accountType?: string;
}
