import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { SmsModule } from './sms/sms.module';
import { OtpAuthService } from './otp-auth.service';
import { OtpGenerator } from './otp-generator';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    UserModule,
    ReferralsModule,
    SmsModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpAuthService, OtpGenerator, OtpRateLimitService, JwtStrategy],
  exports: [AuthService, OtpAuthService, OtpRateLimitService],
})
export class AuthModule {}
