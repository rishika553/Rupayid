// Explicit opt-in integration probe against the running development API.
// Creates one synthetic account; never prints credentials or tokens.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function main() {
  const base = process.env.AUTH_TEST_API_URL || 'http://127.0.0.1:3001/api/v1';
  const email = `auth-debug-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomBytes(24).toString('base64url');
  async function request(path, body, token) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const json = await response.json();
    return { status: response.status, data: json.data ?? json };
  }
  function check(label, actual, expected) {
    assert.equal(actual.status, expected, `${label}: unexpected HTTP status`);
    console.log(`PASS ${label}: HTTP ${expected}`);
  }
  check('unauthenticated profile', await request('/auth/me'), 401);
  check('validation', await request('/auth/register', { email: 'invalid', password: 'short', firstName: 'Test', lastName: 'Probe' }), 400);
  const input = { email, password, firstName: 'Auth', lastName: 'Diagnostic' };
  const registered = await request('/auth/register', input);
  check('registration', registered, 200);
  assert.ok(registered.data.accessToken && registered.data.refreshToken);
  assert.equal(registered.data.user.email, email);
  assert.equal(registered.data.user.passwordHash, undefined);
  const me = await request('/auth/me', undefined, registered.data.accessToken);
  check('registered access token', me, 200);
  assert.equal(me.data.id, registered.data.user.id);
  check('duplicate email', await request('/auth/register', input), 409);
  check('case-insensitive duplicate', await request('/auth/register', { ...input, email: email.toUpperCase() }), 409);
  check('wrong password', await request('/auth/login', { email, password: password + 'wrong' }), 401);
  const login = await request('/auth/login', { email, password });
  check('login', login, 200);
  check('login access token', await request('/auth/me', undefined, login.data.accessToken), 200);
  check('refresh token cannot authorize', await request('/auth/me', undefined, login.data.refreshToken), 401);
  check('tampered access token', await request('/auth/me', undefined, login.data.accessToken + 'x'), 401);
  const rotated = await request('/auth/refresh', { refreshToken: login.data.refreshToken });
  check('refresh rotation', rotated, 200);
  check('rotated access token', await request('/auth/me', undefined, rotated.data.accessToken), 200);
  check('old access revoked', await request('/auth/me', undefined, login.data.accessToken), 401);
  check('refresh replay rejected', await request('/auth/refresh', { refreshToken: login.data.refreshToken }), 401);
  check('logout', await request('/auth/logout', {}, rotated.data.accessToken), 200);
  check('logged-out access rejected', await request('/auth/me', undefined, rotated.data.accessToken), 401);
  check('logged-out refresh rejected', await request('/auth/refresh', { refreshToken: rotated.data.refreshToken }), 401);
  check('registration session logout', await request('/auth/logout', {}, registered.data.accessToken), 200);
  console.log('Synthetic account retained for audit; all test sessions logged out.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
