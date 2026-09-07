import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EvaluateEligibilityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  loanProductId!: string;
}
