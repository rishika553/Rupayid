import { plainToInstance } from 'class-transformer';
import { IsEnum, IsOptional, IsString, validateSync } from 'class-validator';

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
  REFRESH_TOKEN_SECRET!: string;

  @IsOptional()
  @IsString()
  MSG91_AUTH_KEY!: string;

  @IsOptional()
  @IsString()
  MSG91_TEMPLATE_ID!: string;

  @IsOptional()
  @IsString()
  MSG91_SENDER_ID!: string;

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
