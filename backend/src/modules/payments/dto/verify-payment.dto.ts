import { IsString, Matches, MaxLength } from 'class-validator';

export class VerifyCustomerPaymentDto {
  @IsString()
  @MaxLength(64)
  razorpayOrderId!: string;

  @IsString()
  @MaxLength(64)
  razorpayPaymentId!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  razorpaySignature!: string;
}
