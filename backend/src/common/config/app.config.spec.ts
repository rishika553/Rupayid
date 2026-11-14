import { parseCorsOrigins } from './app.config';

describe('CORS origin configuration', () => {
  it('only trusts explicitly configured origins in production', () => {
    expect(parseCorsOrigins('https://example.com/, https://example.com', true)).toEqual(['https://example.com']);
    expect(parseCorsOrigins(undefined, true)).toEqual([]);
  });
  it('preserves local development defaults', () => {
    expect(parseCorsOrigins(undefined, false)).toContain('http://localhost:3000');
  });
});
