import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { SessionService } from './session.service';
import { RateLimitService } from './rate-limit.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    UserModule,
    ReferralsModule,
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
  providers: [AuthService, SessionService, RateLimitService, JwtStrategy],
  exports: [AuthService, SessionService, RateLimitService],
})
export class AuthModule {}
