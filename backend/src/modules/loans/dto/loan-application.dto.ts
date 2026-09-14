import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateLoanApplicationDto {
  @ApiProperty()
  @IsUUID()
  loanProductId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amountRequested!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(60)
  tenureMonths!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyIncome?: number;
}

export class UpdateLoanApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  loanProductId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amountRequested?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(60)
  tenureMonths?: number;

  @ApiPropertyOptional({ enum: ['CANCELLED'] })
  @IsOptional()
  @IsIn(['CANCELLED'])
  status?: 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyIncome?: number;
}

export class SubmitLoanApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
