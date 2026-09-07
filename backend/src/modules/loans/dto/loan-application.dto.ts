import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

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
  tenureMonths!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
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
  tenureMonths?: number;

  @ApiPropertyOptional({ enum: ['CANCELLED'] })
  @IsOptional()
  @IsIn(['CANCELLED'])
  status?: 'CANCELLED';
}

export class SubmitLoanApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
