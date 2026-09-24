import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UserService } from '../../user/user.service';
import { SessionService } from '../session.service';
import { BLOCKED_USER_STATUSES } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
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
      sub: string;
      email: string;
      sid?: string;
      familyId?: string;
      typ?: string;
      aud?: string;
    },
  ) {
    if (payload.typ === 'refresh' || payload.typ === 'admin' || payload.aud === 'admin') {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || (BLOCKED_USER_STATUSES as readonly string[]).includes(user.status)) {
      throw new UnauthorizedException('Invalid or inactive user');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or inactive user');
    }

    let familyId = payload.familyId;
    if (payload.sid) {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (!token) {
        throw new UnauthorizedException('Authentication required');
      }
      const session = await this.sessionService.assertAccessSession(user.id, payload.sid, token);
      familyId = session.familyId;
    }

    const roles = await this.userService.getRoleNames(user.id);
    return {
      id: user.id,
      email: user.email,
      sid: payload.sid,
      familyId,
      roles,
      role: roles[0],
    };
  }
}
