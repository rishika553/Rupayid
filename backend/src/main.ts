import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ThrottleGuard } from './common/guards/throttle.guard';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Throttle guard (100 requests per minute)
  app.useGlobalGuards(new ThrottleGuard(100, 60_000));

  // Swagger/OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RupayAid API')
    .setDescription('Production-grade lending platform API. Modular monolith backend.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'access-token',
    )
    .addTag('auth', 'Authentication & registration')
    .addTag('users', 'User management')
    .addTag('customers', 'Customer profile')
    .addTag('admin', 'Admin operations')
    .addTag('roles', 'RBAC roles & permissions')
    .addTag('kyc', 'KYC applications & verification')
    .addTag('referrals', 'Referral system')
    .addTag('eligibility', 'Eligibility rules & evaluation')
    .addTag('loan-products', 'Loan product configuration')
    .addTag('loans', 'Loan applications')
    .addTag('disbursements', 'Loan disbursements')
    .addTag('repayments', 'Repayment schedules & records')
    .addTag('payments', 'Payment processing')
    .addTag('ledger', 'Financial ledger (append-only)')
    .addTag('notifications', 'Notification delivery')
    .addTag('audit', 'Audit logs (append-only)')
    .addTag('files', 'File upload to R2')
    .addTag('health', 'Health checks')
    .addTag('config', 'System configuration')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'RupayAid API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API prefix: /${apiPrefix}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
