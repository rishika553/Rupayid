import { ConflictException, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReferralsService } from './referrals.service';
import { AdminReferralQueryDto, SubmitReferralDto, UpdateReferralStatusDto } from './dto/referral.dto';

function setup() {
  const owner = { id: 'owner', referralCode: 'RAP-ABCDEFGH' };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(owner), updateMany: jest.fn() },
    referral: { create: jest.fn().mockResolvedValue({ id: 'referral' }), findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0), groupBy: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((input: unknown) => typeof input === 'function' ? input(prisma) : Promise.all(input as Promise<unknown>[]));
  return { prisma, owner, service: new ReferralsService(prisma as never, { log: jest.fn() } as never) };
}
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
  transformOptions: { enableImplicitConversion: true } });
const valid = { referredName: 'Test Friend', referredPhone: '9876543210', consentConfirmed: true };
const parse = (body: unknown) => pipe.transform(body, { type: 'body', metatype: SubmitReferralDto });

describe('Phase 1 referral validation', () => {
  it('normalizes Indian phone and whitespace', async () => {
    expect(await parse({ ...valid, referredName: '  Test   Friend ', referredPhone: '+91 98765 43210' }))
      .toMatchObject({ referredName: 'Test Friend', referredPhone: '+919876543210' });
  });
  it.each(['1234567890', '987654321', '+19876543210', '', '0000000000'])('rejects invalid phone %s', async phone => {
    await expect(parse({ ...valid, referredPhone: phone })).rejects.toThrow();
  });
  it.each([false, 'false', 'true', 1, null, undefined])('requires literal consent true: %s', async consent => {
    await expect(parse({ ...valid, consentConfirmed: consent })).rejects.toThrow();
  });
  it.each(['', ' ', 'A', '<script>', 'A'.repeat(101)])('rejects invalid name %s', async name => {
    await expect(parse({ ...valid, referredName: name })).rejects.toThrow();
  });
  it('rejects caller-provided owner or status', async () => {
    await expect(parse({ ...valid, referrerUserId: 'someone-else' })).rejects.toThrow();
    await expect(parse({ ...valid, status: 'CONVERTED' })).rejects.toThrow();
  });
  it('validates pagination and admin statuses', async () => {
    await expect(pipe.transform({ page: -1 }, { type: 'query', metatype: AdminReferralQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ limit: 101 }, { type: 'query', metatype: AdminReferralQueryDto })).rejects.toThrow();
    await expect(pipe.transform({ status: 'ACCEPTED' }, { type: 'body', metatype: UpdateReferralStatusDto })).rejects.toThrow();
  });
});

describe('Phase 1 referral service', () => {
  it('takes owner/code from session and records consent and PENDING status', async () => {
    const { service, prisma } = setup();
    await service.submit('owner', await parse(valid));
    expect(prisma.referral.create).toHaveBeenCalledWith(expect.objectContaining({ data: {
      referrerId: 'owner', code: 'RAP-ABCDEFGH', referredName: 'Test Friend', referredPhone: '+919876543210',
      status: 'PENDING', consentAttestedAt: expect.any(Date), consentVersion: 'referral-contact-v1',
    } }));
  });
  it('handles concurrent duplicate insert without leaking another customer', async () => {
    const { service, prisma } = setup();
    prisma.referral.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5' }));
    await expect(service.submit('owner', await parse(valid))).rejects.toBeInstanceOf(ConflictException);
  });
  it('scopes history and counts to authenticated owner with pagination', async () => {
    const { service, prisma } = setup();
    await service.listMine('owner', { page: 2, limit: 10 });
    expect(prisma.referral.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { referrerId: 'owner', referredPhone: { not: null } }, skip: 10, take: 10,
    }));
    expect(prisma.referral.count).toHaveBeenCalledWith({ where: { referrerId: 'owner', referredPhone: { not: null } } });
  });
  it('aggregates all statuses and never mixes customer statistics', async () => {
    const { service, prisma } = setup();
    prisma.referral.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } }, { status: 'CONVERTED', _count: { _all: 1 } },
      { status: 'CONTACTED', _count: { _all: 3 } }, { status: 'REJECTED', _count: { _all: 1 } },
    ]);
    expect(await service.statistics('owner')).toEqual({ total: 7, pending: 2, converted: 1, contacted: 3, rejected: 1 });
    expect(prisma.referral.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { referrerId: 'owner', referredPhone: { not: null } } }));
  });
  it('supports admin search and status filters with referrer information', async () => {
    const { service, prisma } = setup();
    await service.listAdmin({ page: 1, limit: 20, status: 'PENDING', search: 'Test' });
    expect(prisma.referral.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'PENDING', OR: expect.any(Array) }),
      select: expect.objectContaining({ referrer: { select: { id: true, firstName: true, lastName: true, email: true } } }),
    }));
  });
  it('updates and audits admin status together without contact details in audit', async () => {
    const { service, prisma } = setup();
    prisma.referral.findFirst.mockResolvedValue({ id: 'referral', status: 'PENDING', updatedAt: new Date() });
    prisma.referral.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.updateStatus('referral', { status: 'CONTACTED' }, 'admin-user')).resolves.toEqual({ id: 'referral', status: 'CONTACTED' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      changedById: 'admin-user', actorIsAdminBoolean: true, diffSummary: { from: 'PENDING', to: 'CONTACTED' },
    }) });
  });
  it('rejects nonexistent or legacy rows and concurrent status edits', async () => {
    const { service, prisma } = setup();
    prisma.referral.findFirst.mockResolvedValue(null);
    await expect(service.updateStatus('missing', { status: 'REJECTED' }, 'admin')).rejects.toThrow('Referral not found');
    prisma.referral.findFirst.mockResolvedValue({ id: 'referral', status: 'PENDING', updatedAt: new Date() });
    prisma.referral.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateStatus('referral', { status: 'REJECTED' }, 'admin')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
  it('generates a unique code without overwriting an existing one in a race', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner', referralCode: null })
      .mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'owner', referralCode: 'RAP-WINNER23' });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    expect((await service.provisionForUser('owner'))?.referralCode).toBe('RAP-WINNER23');
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: 'owner', referralCode: null },
      data: { referralCode: expect.stringMatching(/^RAP-[A-Z0-9]{8}$/), referralCodeCreatedAt: expect.any(Date) } });
  });
});
