import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisbursementMethod, DisbursementStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminLoanListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class AdminLoanApproveDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  approvedAmount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  approvedTenure!: number;

  @ApiProperty({ description: 'Annual interest rate as decimal (0.18) or percent (18)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedInterest!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminLoanRejectDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class AdminDisburseDto {
  @ApiProperty()
  @IsUUID()
  loanApplicationId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ enum: DisbursementMethod, default: DisbursementMethod.NEFT })
  @IsOptional()
  @IsEnum(DisbursementMethod)
  method?: DisbursementMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  beneficiaryBankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  beneficiaryAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  beneficiaryIfsc?: string;
}

export class AdminDisbursementStatusDto {
  @ApiProperty({ enum: DisbursementStatus })
  @IsEnum(DisbursementStatus)
  status!: DisbursementStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  providerReference?: string;
}

export class AdminDisbursementListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  loanApplicationId?: string;
}
