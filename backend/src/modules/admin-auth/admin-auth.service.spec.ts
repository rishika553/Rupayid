import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminAuthService } from './admin-auth.service';
import { ADMIN_ACCOUNT_DISABLED, GENERIC_ADMIN_LOGIN_FAILED } from './admin-auth.constants';

function stub(overrides?: { status?: string; username?: string | null; passwordHash?: string | null }) {
  const passwordHash = overrides && 'passwordHash' in overrides ? overrides.passwordHash : undefined;
  const admin = {
    id: 'admin-1',
    userId: 'user-1',
    username: overrides?.username === undefined ? 'admin' : overrides.username,
    status: overrides?.status ?? 'ACTIVE',
    passwordHash: passwordHash === undefined ? bcrypt.hashSync('admin123', 4) : passwordHash,
  };

  const session = {
    id: 'session-1',
    userId: 'user-1',
    status: 'ACTIVE',
    tokenType: 'ACCESS',
    tokenSha256: 'pending',
    expiresAt: new Date(Date.now() + 60_000),
    metadata: { familyId: 'fam-1', audience: 'admin', adminUserId: 'admin-1' },
  };

  const prisma = {
    adminUser: {
      findUnique: jest.fn(async ({ where }: { where: { username?: string; id?: string } }) => {
        if (where.username && where.username === admin.username) return admin;
        if (where.id === admin.id) return admin;
        return null;
      }),
    },
    session: {
      create: jest.fn(async () => session),
      update: jest.fn(async () => session),
      findUnique: jest.fn(async () => session),
      findMany: jest.fn(async () => [session]),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  };

  const jwt = { sign: jest.fn(() => 'admin.jwt.token') };
  const config = { get: (key: string) => (key === 'JWT_EXPIRES_IN' ? '15m' : undefined) };
  const rateLimit = { assertWithinLimit: jest.fn(async () => undefined) };

  const audit = { log: jest.fn(async () => undefined) };
  const service = new AdminAuthService(prisma as never, jwt as never, config as never, rateLimit as never, audit as never);
  return { admin, session, prisma, jwt, rateLimit, service, audit };
}

describe('AdminAuthService', () => {
  it('logs in with username/password and returns safe admin fields', async () => {
    const { service, jwt, prisma, audit } = stub();
    const result = await service.login('admin', 'admin123', '127.0.0.1', 'jest');
    expect(result.admin).toEqual({ id: 'admin-1', username: 'admin', status: 'ACTIVE' });
    expect(result.accessToken).toBe('admin.jwt.token');
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|password_hash/);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'admin-1', typ: 'admin', aud: 'admin', username: 'admin' }),
    );
    expect(prisma.session.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ADMIN_LOGIN',
        entityId: 'admin-1',
        isActorAdmin: true,
        metadata: expect.objectContaining({ adminUserId: 'admin-1', action: 'ADMIN_LOGIN' }),
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toMatch(/password|otp|accessToken|admin\.jwt/i);
  });

  it('rejects a wrong password', async () => {
    const { service, audit } = stub();
    await expect(service.login('admin', 'wrong-password', '127.0.0.1')).rejects.toMatchObject({
      message: GENERIC_ADMIN_LOGIN_FAILED,
    });
    await expect(service.login('admin', 'wrong-password', '127.0.0.1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects an unknown username without leaking existence', async () => {
    const { service } = stub();
    await expect(service.login('nobody', 'admin1234', '127.0.0.1')).rejects.toMatchObject({
      message: GENERIC_ADMIN_LOGIN_FAILED,
    });
  });

  it('rejects a disabled admin', async () => {
    const { service } = stub({ status: 'DISABLED' });
    await expect(service.login('admin', 'admin123', '127.0.0.1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.login('admin', 'admin123', '127.0.0.1')).rejects.toMatchObject({
      message: ADMIN_ACCOUNT_DISABLED,
    });
  });

  it('getMe returns only id, username, and status', async () => {
    const { service } = stub();
    await expect(service.getMe('admin-1')).resolves.toEqual({
      id: 'admin-1',
      username: 'admin',
      status: 'ACTIVE',
    });
  });

  it('records ADMIN_LOGOUT without tokens', async () => {
    const { service, audit } = stub();
    await service.logout({
      id: 'admin-1',
      username: 'admin',
      status: 'ACTIVE',
      userId: 'user-1',
      familyId: 'fam-1',
      typ: 'admin',
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ADMIN_LOGOUT',
        entityId: 'admin-1',
        metadata: expect.objectContaining({ adminUserId: 'admin-1', action: 'ADMIN_LOGOUT' }),
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls)).not.toMatch(/password|otp|accessToken|admin\.jwt/i);
  });
});
