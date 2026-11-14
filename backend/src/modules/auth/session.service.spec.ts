import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';

function configService() {
  const values: Record<string, string> = {
    JWT_SECRET: 'access-secret',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'refresh-secret',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  };
  return { get: (key: string, fallback?: string) => values[key] ?? fallback };
}

function createStore() {
  const users: Array<Record<string, unknown>> = [
    { id: 'user-1', email: 'ria@example.com', status: 'ACTIVE' },
  ];
  const sessions: Array<Record<string, unknown>> = [];
  let queue = Promise.resolve();

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        users.find((u) => u.id === where.id) || null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = users.find((u) => u.id === where.id)!;
        Object.assign(user, data);
        return user;
      },
    },
    session: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `sess-${sessions.length + 1}`, ...data };
        sessions.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        sessions.find((row) => row.id === where.id) || null,
      findMany: async ({ where }: { where: { userId: string; status: string } }) =>
        sessions.filter((row) => row.userId === where.userId && row.status === where.status),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = sessions.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id?: { in: string[] }; userId?: string; status?: string };
        data: Record<string, unknown>;
      }) => {
        sessions.forEach((row) => {
          if (where.id?.in && !where.id.in.includes(row.id as string)) return;
          if (where.userId && row.userId !== where.userId) return;
          if (where.status && row.status !== where.status) return;
          Object.assign(row, data);
        });
        return { count: 1 };
      },
    },
    $queryRaw: jest.fn(async () => [{ id: 'user-1' }]),
    $transaction: async (operation: (db: unknown) => Promise<unknown>) => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const snapshot = structuredClone(sessions);
      try { return await operation(prisma); }
      catch (error) { sessions.splice(0, sessions.length, ...snapshot); throw error; }
      finally { release(); }
    },
  };

  return { prisma, users, sessions };
}

function createService() {
  const store = createStore();
  const jwt = new JwtService({ secret: 'access-secret', signOptions: { expiresIn: '15m' } });
  const service = new SessionService(store.prisma as never, jwt, configService() as never);
  return { service, store };
}

describe('SessionService', () => {
  it('serializes concurrent refreshes, issues at most one replacement and revokes it on replay', async () => {
    const { service, store } = createService();
    const first = await service.issueCustomerSession('user-1', 'ip');
    const results = await Promise.allSettled([service.refresh(first.refreshToken, 'ip'), service.refresh(first.refreshToken, 'ip')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.sessions).toHaveLength(4);
    expect(store.sessions.every((row) => row.status === 'REVOKED')).toBe(true);
    expect(store.prisma.$queryRaw).toHaveBeenCalled();
  });

  it('revokes descendants on ancestor replay while preserving a different login family', async () => {
    const { service, store } = createService();
    const first = await service.issueCustomerSession('user-1', 'ip');
    const second = await service.refresh(first.refreshToken, 'ip');
    const third = await service.refresh(second.refreshToken, 'ip');
    const unrelated = await service.issueCustomerSession('user-1', 'other-ip');
    await expect(service.refresh(first.refreshToken, 'ip')).rejects.toThrow(UnauthorizedException);
    await expect(service.refresh(third.refreshToken, 'ip')).rejects.toThrow(UnauthorizedException);
    await expect(service.refresh(unrelated.refreshToken, 'other-ip')).resolves.toHaveProperty('accessToken');
    expect(store.sessions.slice(0, 6).every((row) => row.status === 'REVOKED')).toBe(true);
  });

  it('rolls back token consumption if replacement persistence fails', async () => {
    const { service, store } = createService();
    const first = await service.issueCustomerSession('user-1', 'ip');
    const create = jest.spyOn(store.prisma.session, 'create').mockRejectedValueOnce(new Error('database failure'));
    await expect(service.refresh(first.refreshToken, 'ip')).rejects.toThrow('database failure');
    create.mockRestore();
    expect(store.sessions).toHaveLength(2);
    expect(store.sessions.every((row) => row.status === 'ACTIVE')).toBe(true);
    await expect(service.refresh(first.refreshToken, 'ip')).resolves.toHaveProperty('refreshToken');
  });
  it('issues an access and refresh session for an active customer', async () => {
    const { service, store } = createService();
    const result = await service.issueCustomerSession('user-1', '1.1.1.1');

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(store.sessions).toHaveLength(2);
    expect(store.users[0].lastLoginAt).toBeInstanceOf(Date);
  });

  it('refuses to issue a session for a blocked customer', async () => {
    const { service, store } = createService();
    store.users[0].status = 'SUSPENDED';
    await expect(service.issueCustomerSession('user-1', '1.1.1.1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rotates the refresh token and rejects the old one', async () => {
    const { service, store } = createService();
    const first = await service.issueCustomerSession('user-1', '1.1.1.1');
    const rotated = await service.refresh(first.refreshToken, '1.1.1.1');

    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(store.sessions.slice(0, 2).every((row) => row.status === 'REVOKED')).toBe(true);
    await expect(service.refresh(first.refreshToken, '1.1.1.1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logs out only the current session family', async () => {
    const { service, store } = createService();
    await service.issueCustomerSession('user-1', '1.1.1.1');
    const second = await service.issueCustomerSession('user-1', '2.2.2.2');
    const familyId = (store.sessions[2].metadata as { familyId: string }).familyId;

    await service.logout('user-1', familyId);

    expect(store.sessions.slice(0, 2).every((row) => row.status === 'ACTIVE')).toBe(true);
    expect(store.sessions.slice(2).every((row) => row.status === 'LOGGED_OUT')).toBe(true);
    expect(second.accessToken).toBeTruthy();
  });
});
