import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validate } from './common/config/env.validation';
import appConfig from './common/config/app.config';
import jwtConfig from './common/config/jwt.config';
import databaseConfig from './common/config/database.config';
import redisConfig from './common/config/redis.config';

import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AdminModule } from './modules/admin/admin.module';
import { RolesModule } from './modules/roles/roles.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { EligibilityModule } from './modules/eligibility/eligibility.module';
import { LoanProductsModule } from './modules/loan-products/loan-products.module';
import { LoansModule } from './modules/loans/loans.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
import { RepaymentsModule } from './modules/repayments/repayments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { SystemConfigModule } from './modules/config/config.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      load: [appConfig, jwtConfig, databaseConfig, redisConfig],
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    RedisModule,

    AuthModule,
    UserModule,
    CustomersModule,
    AdminModule,
    RolesModule,
    KycModule,
    ReferralsModule,
    EligibilityModule,
    LoanProductsModule,
    LoansModule,
    DisbursementsModule,
    RepaymentsModule,
    PaymentsModule,
    LedgerModule,
    NotificationsModule,
    AuditModule,
    FilesModule,
    HealthModule,
    SystemConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
