import { isAdminApiPath } from './is-admin-api-path';

describe('isAdminApiPath', () => {
  it('matches the admin portal prefix only', () => {
    expect(isAdminApiPath('/api/admin/auth/login')).toBe(true);
    expect(isAdminApiPath('/api/admin/auth/me')).toBe(true);
    expect(isAdminApiPath('/api/v1/admin')).toBe(false);
    expect(isAdminApiPath('/api/v1/auth/login')).toBe(false);
    expect(isAdminApiPath('/api/v1/auth/me')).toBe(false);
  });
});
