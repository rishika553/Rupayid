import 'reflect-metadata';
import { validate } from './env.validation';

describe('environment validation', () => {
  const valid = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/qa',
    JWT_SECRET: 'a'.repeat(40),
    REFRESH_TOKEN_SECRET: 'b'.repeat(40),
    CORS_ORIGIN: 'https://example.com',
  };

  it('accepts explicitly configured production authentication', () => {
    expect(validate(valid).NODE_ENV).toBe('production');
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN', 'REFRESH_TOKEN_SECRET'])(
    'rejects missing production %s', (key) => {
      expect(() => validate({ ...valid, [key]: undefined })).toThrow();
    },
  );

  it('rejects weak production signing secrets without disclosing them', () => {
    expect(() => validate({ ...valid, JWT_SECRET: 'short-secret' })).toThrow();
    try { validate({ ...valid, JWT_SECRET: 'short-secret' }); } catch (error) {
      expect(String(error)).not.toContain('short-secret');
    }
  });
});
