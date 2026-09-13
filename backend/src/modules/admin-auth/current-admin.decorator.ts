import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

export interface CurrentAdminPayload {
  id: string;
  username: string;
  status: string;
  userId: string;
  sid?: string;
  familyId?: string;
  typ: 'admin';
}

export const CurrentAdmin = createParamDecorator(
  (data: keyof CurrentAdminPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.user as CurrentAdminPayload | undefined;
    if (!admin) {
      return null;
    }
    return data ? admin[data] : admin;
  },
);
