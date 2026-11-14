import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { JwtStrategy } from '../../modules/auth/strategies/jwt.strategy';
import { SessionService } from '../../modules/auth/session.service';
import { UserService } from '../../modules/user/user.service';
import { LoanProductsController } from '../../modules/loan-products/loan-products.controller';
import { LoanProductsService } from '../../modules/loan-products/loan-products.service';
import { SystemConfigController } from '../../modules/config/config.controller';
import { SystemConfigService } from '../../modules/config/config.service';
import { LoansController } from '../../modules/loans/loans.controller';
import { LoansService } from '../../modules/loans/loans.service';

describe('admin HTTP validation and authorization (isolated services)', () => {
  let app: INestApplication;
  let origin: string;
  const jwt = new JwtService({ secret: 'isolated-admin-validation-test-secret' });
  const tokens = Object.fromEntries(['staff', 'borrower'].map((sub) => [sub, jwt.sign({ sub, sid: 'session', typ: 'access' })]));
  const writes = { create: jest.fn(), update: jest.fn(), upsert: jest.fn(), approve: jest.fn(), reject: jest.fn(), transitionState: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LoanProductsController, SystemConfigController, LoansController],
      providers: [Reflector, JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'isolated-admin-validation-test-secret' } },
        { provide: UserService, useValue: { findById: async (id: string) => ({ id, status: 'ACTIVE' }), getRoleNames: async (id: string) => [id === 'staff' ? 'ADMIN' : 'BORROWER'] } },
        { provide: SessionService, useValue: { assertAccessSession: async () => ({ familyId: 'family' }) } },
        ...[LoanProductsService, SystemConfigService, LoansService].map((provide) => ({ provide, useValue: writes })),
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalGuards(new JwtAuthGuard(module.get(Reflector)), new RolesGuard(module.get(Reflector)));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
  });
  afterAll(async () => app?.close());
  it.each([
    ['POST', '/loan-products'], ['PATCH', '/loan-products/product'], ['POST', '/config/key'],
    ['PATCH', '/loans/applications/loan/approve'], ['PATCH', '/loans/applications/loan/reject'], ['PATCH', '/loans/applications/loan/state'],
  ])('%s %s rejects anonymous, borrower and malformed admin requests before writes', async (method, path) => {
    for (const [token, status] of [[undefined, 401], [tokens.borrower, 403], [tokens.staff, 400]] as const) {
      const response = await fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ unexpected: true }) });
      expect(response.status).toBe(status);
    }
    for (const write of Object.values(writes)) expect(write).not.toHaveBeenCalled();
  });
});
