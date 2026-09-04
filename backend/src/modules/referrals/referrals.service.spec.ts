import { BadRequestException } from '@nestjs/common';
import { MAX_REFERRALS_PER_USER, ReferralsService } from './referrals.service';

function service() {
  const users = [
    { id: 'referrer-1', referralCode: 'RAP-ABCD2345', status: 'ACTIVE', referralCodeCreatedAt: new Date(), createdAt: new Date() },
    { id: 'referee-1', referralCode: 'RAP-WXYZ6789', status: 'ACTIVE', referralCodeCreatedAt: new Date(), createdAt: new Date() },
  ];
  const referrals: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; referralCode?: string } }) => {
        if (where.id) {
          return users.find((row) => row.id === where.id) || null;
        }
        if (where.referralCode) {
          return users.find((row) => row.referralCode === where.referralCode) || null;
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const user = users.find((row) => row.id === where.id);
        if (!user) {
          return null;
        }
        Object.assign(user, data);
        return user;
      }),
    },
    referral: {
      count: jest.fn(async ({ where }: { where: { referrerId: string } }) =>
        referrals.filter((row) => row.referrerId === where.referrerId).length,
      ),
      findUnique: jest.fn(async ({ where }: { where: { refereeId: string } }) =>
        referrals.find((row) => row.refereeId === where.refereeId) || null,
      ),
      findMany: jest.fn(async ({ where }: { where: { referrerId: string } }) =>
        referrals
          .filter((row) => row.referrerId === where.referrerId)
          .map((row) => ({
            ...row,
            referee: { firstName: 'New', lastName: 'User' },
          })),
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ref-${referrals.length + 1}`, ...data };
        referrals.push(row);
        return row;
      }),
    },
  };
  const audit = { log: jest.fn() };
  return {
    referrals,
    audit,
    svc: new ReferralsService(prisma as never, audit as never),
  };
}

describe('ReferralsService', () => {
  it('rejects an unknown code without leaking owner details', async () => {
    const { svc } = service();
    await expect(svc.validateCode('RAP-ZZZZZZZZ', '1.1.1.1')).resolves.toEqual({
      valid: false,
      reason: 'not_found',
    });
  });

  it('accepts another customer code', async () => {
    const { svc } = service();
    await expect(svc.validateCode('rap-abcd2345', '1.1.1.1')).resolves.toEqual({ valid: true });
  });

  it('does not let a user apply their own code', async () => {
    const { svc, referrals, audit } = service();
    const result = await svc.applyAtFirstVerification({
      refereeId: 'referrer-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: true,
    });
    expect(result).toBeNull();
    expect(referrals).toHaveLength(0);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'REFERRAL_REJECTED' }));
  });

  it('stores a unique relationship with createdAt metadata on first verification', async () => {
    const { svc, referrals, audit } = service();
    const created = await svc.applyAtFirstVerification({
      refereeId: 'referee-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: true,
    });
    expect(created).toMatchObject({
      referrerId: 'referrer-1',
      refereeId: 'referee-1',
      code: 'RAP-ABCD2345',
      status: 'ACCEPTED',
    });
    expect(referrals).toHaveLength(1);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'REFERRAL_CREATED' }));
  });

  it('ignores a code on a returning customer to prevent retroactive linking', async () => {
    const { svc, referrals } = service();
    const created = await svc.applyAtFirstVerification({
      refereeId: 'referee-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: false,
    });
    expect(created).toBeNull();
    expect(referrals).toHaveLength(0);
  });

  it('blocks a second inbound referral for the same referee', async () => {
    const { svc, referrals } = service();
    await svc.applyAtFirstVerification({
      refereeId: 'referee-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: true,
    });
    const second = await svc.applyAtFirstVerification({
      refereeId: 'referee-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: true,
    });
    expect(second).toBeNull();
    expect(referrals).toHaveLength(1);
  });

  it('enforces a per-referrer cap', async () => {
    const { svc, referrals } = service();
    for (let i = 0; i < MAX_REFERRALS_PER_USER; i += 1) {
      referrals.push({ referrerId: 'referrer-1', refereeId: `u-${i}` });
    }
    const created = await svc.applyAtFirstVerification({
      refereeId: 'referee-1',
      rawCode: 'RAP-ABCD2345',
      firstVerification: true,
    });
    expect(created).toBeNull();
  });

  it('rate-limits public validation', async () => {
    const { svc } = service();
    for (let i = 0; i < 20; i += 1) {
      await svc.validateCode('RAP-ABCD2345', '9.9.9.9');
    }
    await expect(svc.validateCode('RAP-ABCD2345', '9.9.9.9')).rejects.toBeInstanceOf(BadRequestException);
  });
});
