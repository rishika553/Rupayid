import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AdminJwtStrategy } from '../admin-auth/admin-jwt.strategy';
import { UserService } from '../user/user.service';
import { SessionService } from '../auth/session.service';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { ReferralsService } from './referrals.service';

describe('Referral HTTP authentication boundaries', () => {
  let app: INestApplication;
  let origin: string;
  const jwt = new JwtService({ secret: 'isolated-referral-test-secret' });
  const customer = jwt.sign({ sub: 'customer', sid: 'session', typ: 'access' });
  const admin = jwt.sign({ sub: 'admin', sid: 'admin-session', typ: 'admin', aud: 'admin' });
  const service = { submit: jest.fn().mockResolvedValue({ id: 'referral' }), listMine: jest.fn().mockResolvedValue({ data: [] }),
    statistics: jest.fn().mockResolvedValue({ total: 0 }), listAdmin: jest.fn().mockResolvedValue({ data: [] }),
    updateStatus: jest.fn().mockResolvedValue({ status: 'CONTACTED' }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReferralsController, AdminReferralsController],
      providers: [JwtStrategy, AdminJwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'isolated-referral-test-secret' } },
        { provide: UserService, useValue: { findById: async () => ({ id: 'customer', status: 'ACTIVE' }), getRoleNames: async () => ['CUSTOMER'] } },
        { provide: SessionService, useValue: { assertAccessSession: async () => ({ familyId: 'family' }) } },
        { provide: AdminAuthService, useValue: { assertAdminAccess: async () => ({ id: 'admin', userId: 'admin-user', typ: 'admin' }) } },
        { provide: ReferralsService, useValue: service },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()), new AdminAuthGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); });
  async function request(path: string, token?: string, method = 'GET', body?: unknown) {
    return fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined });
  }
  it.each(['/referrals/history', '/referrals/statistics', '/api/admin/referrals'])('rejects anonymous access to %s', async path => {
    expect((await request(path)).status).toBe(401);
  });
  it('rejects anonymous submission and forged ownership', async () => {
    const input = { referredName: 'Test Friend', referredPhone: '9876543210', consentConfirmed: true };
    expect((await request('/referrals', undefined, 'POST', input)).status).toBe(401);
    expect((await request('/referrals', customer, 'POST', { ...input, referrerUserId: 'other' })).status).toBe(400);
    expect((await request('/referrals', customer, 'POST', input)).status).toBe(201);
    expect(service.submit).toHaveBeenCalledWith('customer', expect.objectContaining({ referredPhone: '+919876543210' }));
  });
  it('rejects customer tokens on admin list and status update', async () => {
    expect((await request('/api/admin/referrals', customer)).status).toBe(401);
    expect((await request('/api/admin/referrals/123/status', customer, 'PATCH', { status: 'CONVERTED' })).status).toBe(401);
  });
  it('rejects admin tokens on customer referral APIs', async () => {
    expect((await request('/referrals/history', admin)).status).toBe(401);
  });
  it('allows admin listing and validated status updates', async () => {
    expect((await request('/api/admin/referrals?status=PENDING', admin)).status).toBe(200);
    const path = '/api/admin/referrals/00000000-0000-4000-8000-000000000001/status';
    expect((await request(path, admin, 'PATCH', { status: 'UNKNOWN' })).status).toBe(400);
    expect((await request(path, admin, 'PATCH', { status: 'CONTACTED' })).status).toBe(200);
    expect(service.updateStatus).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', expect.objectContaining({ status: 'CONTACTED' }), 'admin-user');
  });
});
