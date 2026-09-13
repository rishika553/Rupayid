import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminKycListQueryDto {
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

  @ApiPropertyOptional({ description: 'KYC status, or PENDING / DECLINED aliases' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Customer name or mobile' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class AdminKycDeclineDto {
  @ApiProperty({ example: 'Document verification failed' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
