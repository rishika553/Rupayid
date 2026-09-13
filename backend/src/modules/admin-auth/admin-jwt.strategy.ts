import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminAuthService } from './admin-auth.service';
import { ADMIN_AUTH_AUDIENCE, ADMIN_AUTH_TYP } from './admin-auth.constants';
import type { CurrentAdminPayload } from './current-admin.decorator';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: {
      sub?: string;
      username?: string;
      sid?: string;
      familyId?: string;
      typ?: string;
      aud?: string;
    },
  ): Promise<CurrentAdminPayload> {
    if (payload.typ !== ADMIN_AUTH_TYP || payload.aud !== ADMIN_AUTH_AUDIENCE || !payload.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token || !payload.sid) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.adminAuthService.assertAdminAccess(payload.sub, payload.sid, token);
  }
}
