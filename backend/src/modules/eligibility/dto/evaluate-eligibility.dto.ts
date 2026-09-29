import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class EvaluateEligibilityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  loanProductId!: string;

  @ApiPropertyOptional({ description: 'Monthly income declared on the application form' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  monthlyIncome?: number;

  @ApiPropertyOptional({ description: 'Employment type declared on the application form' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  employmentType?: string;
}
