import { sanitizeAuditJson } from './audit.service';

describe('AuditService sanitization', () => {
  it('omits passwords, tokens, OTPs, and storage credentials from audit payloads', () => {
    const cleaned = sanitizeAuditJson({
      adminUserId: 'admin-1',
      action: 'KYC_APPROVED',
      password: 'secret',
      otp: '123456',
      accessToken: 'jwt',
      refreshToken: 'refresh',
      apiKey: 'key',
      R2_SECRET_ACCESS_KEY: 'cloud',
      fileStorageKey: 'kyc/user/app/file.png',
      nested: { authorization: 'Bearer x', customerId: 'cust-1' },
    });
    expect(cleaned).toEqual({
      adminUserId: 'admin-1',
      action: 'KYC_APPROVED',
      nested: { customerId: 'cust-1' },
    });
    expect(JSON.stringify(cleaned)).not.toMatch(/password|otp|token|secret|apiKey|fileStorageKey|authorization/i);
  });
});
