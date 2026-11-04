const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load({ native = true, clientId = 'web-client', result = { type: 'success', data: { idToken: 'google-id-token' } }, error, playServicesError } = {}) {
  const calls = [];
  const sdk = {
    GoogleSignin: {
      configure: value => calls.push(['configure', value]),
      hasPlayServices: async () => { calls.push(['playServices']); if (playServicesError) throw playServicesError; },
      signIn: async () => { calls.push(['signIn']); if (error) throw error; return result; },
    },
    isErrorWithCode: value => Boolean(value && typeof value.code === 'string'),
    statusCodes: { SIGN_IN_CANCELLED: 'cancelled', IN_PROGRESS: 'in-progress', PLAY_SERVICES_NOT_AVAILABLE: 'no-play-services' },
  };
  const filename = path.resolve(__dirname, '../src/auth/google-sign-in.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: clientId } },
    require: name => {
      if (name === 'react-native') return { Platform: { OS: 'android' }, TurboModuleRegistry: { get: () => native ? {} : null } };
      assert.equal(name, '@react-native-google-signin/google-signin');
      calls.push(['loadSdk']);
      return sdk;
    },
  });
  return { getToken: exports.getGoogleIdToken, calls };
}

test('Expo Go reports an unavailable preview without loading the native SDK', async () => {
  const h = load({ native: false });
  await assert.rejects(h.getToken(), /unavailable in this preview/);
  assert.equal(h.calls.length, 0);
});

test('missing configuration does not attempt Google authentication', async () => {
  const h = load({ clientId: '' });
  await assert.rejects(h.getToken(), /not available yet/);
  assert.equal(h.calls.length, 0);
});

test('requests a Google ID token with the same web audience used by the backend', async () => {
  const h = load();
  assert.equal(await h.getToken(), 'google-id-token');
  assert.equal(h.calls[1][1].webClientId, 'web-client');
  assert.equal(h.calls[1][1].offlineAccess, false);
  assert.deepEqual(h.calls.map(c => c[0]), ['loadSdk', 'configure', 'playServices', 'signIn']);
});

test('cancelling account selection produces no credential', async () => {
  assert.equal(await load({ result: { type: 'cancelled' } }).getToken(), null);
  assert.equal(await load({ error: { code: 'cancelled' } }).getToken(), null);
});

test('missing ID token cannot be treated as an authenticated account', async () => {
  await assert.rejects(load({ result: { type: 'success', data: { idToken: null } } }).getToken(), /Could not sign in/);
});

test('unavailable Play Services gives an actionable error without signing in', async () => {
  const h = load({ playServicesError: { code: 'no-play-services' } });
  await assert.rejects(h.getToken(), /Google Play Services is unavailable/);
  assert.equal(h.calls.some(c => c[0] === 'signIn'), false);
});

test('duplicate and provider failures return user-facing errors', async () => {
  await assert.rejects(load({ error: { code: 'in-progress' } }).getToken(), /already in progress/);
  await assert.rejects(load({ error: { code: 'DEVELOPER_ERROR', message: 'provider internals' } }).getToken(), /Could not sign in with Google/);
});
