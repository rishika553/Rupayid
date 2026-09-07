import type { ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest injects Reflector at runtime
import { Reflector } from '@nestjs/core';
import { isObservable, lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{ headers?: { authorization?: string } }>();
    const hasBearer = Boolean(request.headers?.authorization);

    if (isPublic && !hasBearer) {
      return true;
    }

    if (isPublic && hasBearer) {
      try {
        const allowed = await this.resolveActivate(super.canActivate(context));
        return allowed || true;
      } catch {
        return true;
      }
    }

    return this.resolveActivate(super.canActivate(context));
  }

  handleRequest<TUser = Record<string, unknown>>(
    err: Error | null,
    user: TUser | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return (err || !user ? null : user) as TUser;
    }
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private async resolveActivate(value: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean> {
    if (isObservable(value)) {
      return lastValueFrom(value);
    }
    return value;
  }
}
