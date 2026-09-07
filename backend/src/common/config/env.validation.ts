import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsOptional()
  @IsString()
  PORT!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN!: string;

  @IsString()
  CORS_ORIGIN!: string;

  @IsOptional()
  @IsString()
  REDIS_URL!: string;

  @IsOptional()
  @IsString()
  OTP_PEPPER!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  DEV_OTP_CODE!: string;

  @IsOptional()
  @IsString()
  API_PUBLIC_URL!: string;

  @IsOptional()
  @IsString()
  FILE_UPLOAD_SECRET!: string;

  @IsOptional()
  @IsString()
  REFRESH_TOKEN_SECRET!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_USERNAME!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_PASSWORD!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_BASE_URL!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_SENDER_ID!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_ENTITY_ID!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_OTP_MESSAGE!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_OTP!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_KYC_APPROVED!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_KYC_REJECTED!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_LOAN_APPROVED!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_DISBURSEMENT!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_REPAYMENT_DUE!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_REPAYMENT_SUCCESSFUL!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_PAYMENT_FAILED!: string;

  @IsOptional()
  @IsString()
  DIGIMILES_TEMPLATE_DEFAULT!: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY!: string;

  @IsOptional()
  @IsString()
  RESEND_FROM_EMAIL!: string;

  @IsOptional()
  @IsString()
  NOTIFICATION_PAYLOAD_SECRET!: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN!: string;

  @IsOptional()
  @IsString()
  R2_ACCOUNT_ID!: string;

  @IsOptional()
  @IsString()
  R2_ACCESS_KEY_ID!: string;

  @IsOptional()
  @IsString()
  R2_SECRET_ACCESS_KEY!: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_NAME!: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_ID!: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_SECRET!: string;

  @IsOptional()
  @IsString()
  RAZORPAY_WEBHOOK_SECRET!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation error:\n${errors.toString()}`);
  }

  return validatedConfig;
}
