import type { Request } from 'express';
import { JwtStrategy } from './jwt.strategy';

describe('customer JWT session enforcement', () => {
  const userService = {
    findById: jest.fn().mockResolvedValue({ id: 'customer', status: 'ACTIVE' }),
    getRoleNames: jest.fn().mockResolvedValue(['BORROWER']),
  };
  const sessions = { assertAccessSession: jest.fn().mockResolvedValue({ familyId: 'family' }) };
  const strategy = new JwtStrategy(
    { get: () => 'unit-test-signing-secret' } as never,
    userService as never, sessions as never,
  );
  const request = { headers: { authorization: 'Bearer test-token' } } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('rejects a token without a persisted session', async () => {
    await expect(strategy.validate(request, { sub: 'customer', email: 'qa@example.com', typ: 'access' })).rejects.toThrow();
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('rejects untyped legacy tokens', async () => {
    await expect(strategy.validate(request, { sub: 'customer', email: 'qa@example.com', sid: 'session' })).rejects.toThrow();
  });

  it('checks the persisted session for a valid access payload', async () => {
    await expect(strategy.validate(request, { sub: 'customer', email: 'qa@example.com', sid: 'session', typ: 'access' })).resolves.toMatchObject({ id: 'customer' });
    expect(sessions.assertAccessSession).toHaveBeenCalledWith('customer', 'session', 'test-token');
  });
});
