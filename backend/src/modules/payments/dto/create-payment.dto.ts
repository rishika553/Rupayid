import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCustomerPaymentDto {
  @IsUUID()
  loanId!: string;

  @IsInt()
  @Min(1)
  installmentNumber!: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
