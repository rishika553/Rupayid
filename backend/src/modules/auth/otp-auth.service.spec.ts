import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { OtpAuthService } from './otp-auth.service';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { OTP_CONFIG } from './otp.constants';
import { hashOtp } from './crypto.util';

const PEPPER = 'test-pepper';
const PHONE = '+919876543210';
const OTP = '123456';

function configService() {
  const values: Record<string, string> = {
    NODE_ENV: 'test',
    JWT_SECRET: 'access-secret',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_SECRET: 'refresh-secret',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    OTP_PEPPER: PEPPER,
  };
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  };
}

function createPrismaStore() {
  const users: Array<Record<string, unknown>> = [];
  const otpRequests: Array<Record<string, unknown>> = [];
  const sessions: Array<Record<string, unknown>> = [];
  const roles = [{ id: 'role-borrower', name: 'BORROWER' }];

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { id?: string; phoneNumber?: string; referralCode?: string } }) => {
        if (where.id) {
          return users.find((u) => u.id === where.id) || null;
        }
        if (where.phoneNumber) {
          return users.find((u) => u.phoneNumber === where.phoneNumber) || null;
        }
        if (where.referralCode) {
          return users.find((u) => u.referralCode === where.referralCode) || null;
        }
        return null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const user = {
          id: `user-${users.length + 1}`,
          status: 'PENDING_VERIFICATION',
          phoneVerified: false,
          firstName: 'Customer',
          lastName: '3210',
          createdAt: new Date(),
          ...data,
        };
        users.push(user);
        return user;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
        select?: unknown;
      }) => {
        const user = users.find((u) => u.id === where.id);
        if (!user) {
          throw new Error('missing user');
        }
        Object.assign(user, data);
        return user;
      },
    },
    role: {
      findUnique: async ({ where }: { where: { name: string } }) =>
        roles.find((r) => r.name === where.name) || null,
    },
    otpRequest: {
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: { userId: string; purpose: string; status: string };
        orderBy?: { createdAt: string };
      }) => {
        const matches = otpRequests.filter(
          (row) =>
            row.userId === where.userId &&
            row.purpose === where.purpose &&
            row.status === where.status,
        );
        if (!matches.length) {
          return null;
        }
        if (orderBy?.createdAt === 'desc') {
          return matches[matches.length - 1];
        }
        return matches[0];
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        otpRequests.find((row) => row.id === where.id) || null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `otp-${otpRequests.length + 1}`, attempts: 0, ...data };
        otpRequests.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = otpRequests.find((item) => item.id === where.id);
        if (!row) {
          throw new Error('missing otp');
        }
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId?: string; purpose?: string; status?: string; id?: { in: string[] } };
        data: Record<string, unknown>;
      }) => {
        otpRequests.forEach((row) => {
          if (where.userId && row.userId !== where.userId) {
            return;
          }
          if (where.purpose && row.purpose !== where.purpose) {
            return;
          }
          if (where.status && row.status !== where.status) {
            return;
          }
          Object.assign(row, data);
        });
        return { count: 1 };
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
        const row = sessions.find((item) => item.id === where.id);
        if (!row) {
          throw new Error('missing session');
        }
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
          if (where.id?.in && !where.id.in.includes(row.id as string)) {
            return;
          }
          if (where.userId && row.userId !== where.userId) {
            return;
          }
          if (where.status && row.status !== where.status) {
            return;
          }
          Object.assign(row, data);
        });
        return { count: 1 };
      },
    },
    $transaction: async (ops: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>)) => {
      if (typeof ops === 'function') {
        return ops(prisma);
      }
      return Promise.all(ops);
    },
  };

  return { prisma, users, otpRequests, sessions };
}

function createService(overrides?: {
  rateLimit?: { assertWithinLimit: jest.Mock };
  prismaStore?: ReturnType<typeof createPrismaStore>;
}) {
  const store = overrides?.prismaStore || createPrismaStore();
  const jwt = new JwtService({ secret: 'access-secret', signOptions: { expiresIn: '15m' } });
  const cfg = configService();
  const rateLimit =
    overrides?.rateLimit ||
    new OtpRateLimitService({ incr: async () => 1 } as never, cfg as never);
  const sms = { sendOtp: jest.fn().mockResolvedValue({ providerMessageId: 'mock-1' }) };
  const generator = { generate: () => OTP };

  const referrals = {
    provisionForUser: jest.fn(async () => null),
    applyAtFirstVerification: jest.fn(async () => null),
  };
  const service = new OtpAuthService(
    store.prisma as never,
    jwt,
    cfg as never,
    generator as never,
    rateLimit as never,
    sms as never,
    referrals as never,
  );

  return { service, store, sms, rateLimit, referrals };
}

describe('OtpAuthService', () => {
  describe('valid OTP', () => {
    it('issues session tokens and marks OTP used', async () => {
      const { service, store, sms, referrals } = createService();
      const requested = await service.requestOtp(PHONE, '1.1.1.1');
      expect(sms.sendOtp).toHaveBeenCalledWith({ to: PHONE, otp: OTP });
      expect(sms.sendOtp.mock.calls[0][0]).not.toHaveProperty('otpLogged');

      const result = await service.verifyOtp(PHONE, OTP, requested.otpRequestId as string, '1.1.1.1');

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.phoneVerified).toBe(true);
      expect(referrals.provisionForUser).toHaveBeenCalled();
      expect(referrals.applyAtFirstVerification).toHaveBeenCalledWith(
        expect.objectContaining({ firstVerification: true, refereeId: store.users[0].id }),
      );
      expect(store.otpRequests[0].status).toBe('USED');
      expect(store.sessions).toHaveLength(2);
    });
  });

  describe('expired OTP', () => {
    it('rejects and marks the request expired', async () => {
      const store = createPrismaStore();
      store.users.push({
        id: 'user-1',
        email: 'otp.919876543210@users.rupayaid.internal',
        phoneNumber: PHONE,
        status: 'ACTIVE',
      });
      store.otpRequests.push({
        id: 'otp-exp',
        userId: 'user-1',
        target: PHONE,
        purpose: 'LOGIN',
        status: 'ACTIVE',
        otpHash: hashOtp(PEPPER, PHONE, OTP),
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        maxAttempts: 5,
      });
      const { service } = createService({ prismaStore: store });

      await expect(service.verifyOtp(PHONE, OTP, 'otp-exp', '1.1.1.1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(store.otpRequests[0].status).toBe('EXPIRED');
      expect(store.sessions).toHaveLength(0);
    });
  });

  describe('incorrect OTP', () => {
    it('rejects and increments attempts', async () => {
      const { service, store } = createService();
      const requested = await service.requestOtp(PHONE, '1.1.1.1');

      await expect(
        service.verifyOtp(PHONE, '000000', requested.otpRequestId as string, '1.1.1.1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(store.otpRequests[0].attempts).toBe(1);
      expect(store.otpRequests[0].status).toBe('ACTIVE');
    });
  });

  describe('too many attempts', () => {
    it('locks the OTP after max failures', async () => {
      const { service, store } = createService();
      const requested = await service.requestOtp(PHONE, '2.2.2.2');
      const id = requested.otpRequestId as string;

      for (let i = 0; i < OTP_CONFIG.maxAttempts; i += 1) {
        await expect(service.verifyOtp(PHONE, '000000', id, '2.2.2.2')).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }

      expect(store.otpRequests[0].status).toBe('LOCKED');
      await expect(service.verifyOtp(PHONE, OTP, id, '2.2.2.2')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(store.sessions).toHaveLength(0);
    });
  });

  describe('resend cooldown', () => {
    it('rejects a second request before cooldown elapses', async () => {
      const { service } = createService();
      await service.requestOtp(PHONE, '3.3.3.3');
      await expect(service.requestOtp(PHONE, '3.3.3.3')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('rate limiting', () => {
    it('stops OTP requests when the limiter rejects', async () => {
      const { service, sms } = createService({
        rateLimit: {
          assertWithinLimit: jest
            .fn()
            .mockRejectedValue(
              new HttpException('Too many requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS),
            ),
        },
      });

      await expect(service.requestOtp(PHONE, '4.4.4.4')).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      expect(sms.sendOtp).not.toHaveBeenCalled();
    });
  });
});
