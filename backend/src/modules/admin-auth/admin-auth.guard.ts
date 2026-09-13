import type { ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest injects Reflector at runtime
import { Reflector } from '@nestjs/core';
import { isObservable, lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { isAdminApiPath } from '../../common/http/is-admin-api-path';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
    if (!isAdminApiPath(request.originalUrl || request.url)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return this.resolveActivate(super.canActivate(context));
  }

  handleRequest<TUser = Record<string, unknown>>(
    err: Error | null,
    user: TUser | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
    if (!isAdminApiPath(request.originalUrl || request.url)) {
      return user as TUser;
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
