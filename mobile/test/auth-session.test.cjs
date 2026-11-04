const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rootRequire = require('node:module').createRequire(path.resolve(__dirname, '../../package.json'));
const rendererRequire = require('node:module').createRequire(rootRequire.resolve('react-dom/package.json'));
const React = rendererRequire('react');
const { renderToString } = rootRequire('react-dom/server');

const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const auth = id => ({ accessToken: `${id}-access`, refreshToken: `${id}-refresh`, user: { id } });
const tick = () => new Promise(resolve => setImmediate(resolve));
const keys = [
  ['dashboard', 'customer'], ['kyc', 'my'], ['kyc', 'status'],
  ['loans', 'my'], ['loans', 'track', 'me'], ['loans', 'repayment-schedule', 'a-loan'],
  ['payments', 'me'], ['customers', 'me'], ['notifications', 'me'], ['referrals', 'me'],
];

// Execute production TS with real TanStack Query; mock only native storage,
// transport and router surfaces. No database or real accounts are touched.
function harness() {
  const modules = new Map();
  const calls = [];
  let saved = null;
  let write = async tokens => { saved = tokens; };
  let route = async (endpoint, options) => {
    if (endpoint === '/auth/login') return response(200, { data: auth(JSON.parse(options.body).email) });
    if (endpoint === '/auth/logout') return response(200, { data: {} });
    throw new Error(`Unexpected request ${endpoint}`);
  };
  let session;
  let segments = ['(app)', 'dashboard'];
  let slotRenders = 0;
  const storage = {
    readAuth: async () => saved,
    writeAuth: tokens => write(tokens),
    clearAuth: async () => { saved = null; },
  };
  const overrides = {
    '@/auth/auth-context': {
      useAuth: () => ({ ...session.getSnapshot(), isAuthenticated: Boolean(session.getSnapshot().user), refreshUser: session.refreshUser, logout: session.logout }),
      AuthProvider: ({ children }) => children,
    },
    'expo-router': {
      useSegments: () => segments,
      useRouter: () => ({ replace() {} }),
      Slot: () => { slotRenders++; return React.createElement('span', null, 'screen'); },
    },
    'expo-status-bar': { StatusBar: () => null },
    'react-native': {
      View: ({ children }) => React.createElement('div', null, children),
      Text: ({ children }) => React.createElement('span', null, children),
      Button: ({ title, onPress }) => React.createElement('button', { onClick: onPress }, title),
    },
  };
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, {
      exports, process, __DEV__: false, console, setTimeout, clearTimeout, AbortController, URLSearchParams,
      fetch: async (url, options) => {
        const endpoint = new URL(url).pathname.replace('/api/v1', '');
        calls.push({ endpoint, ...options });
        return route(endpoint, options);
      },
      require: name => {
        if (name.endsWith('secure-storage')) return storage;
        if (overrides[name]) return overrides[name];
        if (name === '@/api/client') return load('src/api/client.ts');
        if (name === 'react' || name.startsWith('react/')) return rendererRequire(name);
        return require(name);
      },
    }, { filename });
    return exports;
  }
  const { AuthSession } = load('src/auth/session.ts');
  session = new AuthSession();
  const { requireApi } = load('src/api/client.ts');
  return {
    session, calls, requireApi, load,
    mock(name, value) { overrides[name] = value; },
    get saved() { return saved; },
    set saved(value) { saved = value; },
    set route(value) { route = value; },
    set write(value) { write = value; },
    store: tokens => { saved = tokens; },
    seed() { for (const key of keys) session.getSnapshot().queryClient.setQueryData(key, { owner: 'A' }); },
    render(group = '(app)') {
      segments = [group];
      slotRenders = 0;
      const { AuthGate } = load('app/_layout.tsx');
      const html = renderToString(React.createElement(AuthGate));
      return { html, slotRenders };
    },
  };
}

test('logout clears every customer cache and hides protected screens before remote revocation completes', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  const old = h.session.getSnapshot();
  const remote = deferred();
  h.route = () => remote.promise;
  const logout = h.session.logout();
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(old.queryClient.getQueryCache().getAll().length, 0);
  assert.equal(h.render().slotRenders, 0);
  await logout;
  assert.equal(h.saved, null);
  assert.equal(h.calls.at(-1).headers.Authorization, 'Bearer A-access');
  remote.resolve(response(500, { message: 'offline' }));
  await tick();
});

test('switching directly from A to B creates an empty cache and rejects old callbacks', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  const old = h.session.getSnapshot();
  const switching = h.session.signIn('B', 'password');
  assert.equal(h.render().slotRenders, 0);
  await switching;
  const current = h.session.getSnapshot();
  assert.equal(current.user.id, 'B');
  assert.notEqual(current.queryClient, old.queryClient);
  for (const key of keys) assert.equal(current.queryClient.getQueryData(key), undefined);
  // An old mutation callback holds the old client/cache even after unmount.
  old.queryClient.setQueryData(['customers', 'me'], { owner: 'A' });
  assert.equal(current.queryClient.getQueryData(['customers', 'me']), undefined);
  const count = h.calls.length;
  assert.equal((await old.client.post('/payments/old/verify', {})).success, false);
  assert.equal(h.calls.length, count);
  assert.equal(h.saved.accessToken, 'B-access');
  assert.equal(h.render().slotRenders, 1);
});

test('logout followed by another login cannot reuse cached customer information', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  await h.session.logout();
  await h.session.signIn('B', 'password');
  for (const key of keys) assert.equal(h.session.getSnapshot().queryClient.getQueryData(key), undefined);
});

test('late query response is aborted and cannot repopulate the new account cache', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  const old = h.session.getSnapshot();
  const delayed = deferred();
  h.route = endpoint => endpoint === '/dashboard' ? delayed.promise : response(200, { data: auth('B') });
  const query = old.queryClient.fetchQuery({
    queryKey: keys[0], queryFn: () => h.requireApi(old.client.get('/dashboard')), retry: false,
  }).catch(error => error);
  const request = h.calls.at(-1);
  await h.session.signIn('B', 'password');
  assert.equal(request.signal.aborted, true);
  delayed.resolve(response(200, { data: { owner: 'A' } }));
  await query;
  await tick();
  assert.equal(h.session.getSnapshot().queryClient.getQueryData(keys[0]), undefined);
  assert.equal(old.queryClient.getQueryCache().getAll().length, 0);
});

test('failed account switching leaves no old user, cached data or tokens', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  h.route = () => response(401, { message: 'Invalid credentials' });
  await assert.rejects(h.session.signIn('B', 'bad'), /Invalid credentials/);
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.saved, null);
  assert.equal(h.session.getSnapshot().queryClient.getQueryCache().getAll().length, 0);
  assert.equal(h.render().slotRenders, 0);
  assert.equal(h.render('(auth)').slotRenders, 1);
});

test('token persistence failure never publishes an authenticated account', async () => {
  const h = harness();
  h.write = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(h.session.signIn('A', 'password'), /Storage unavailable/);
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.saved, null);
  assert.equal(h.render().slotRenders, 0);
});

for (const failure of ['rejected', 'retry401', 'storage']) {
  test(`refresh ${failure} ends authentication and clears private data`, async () => {
    const h = harness();
    await h.session.signIn('A', 'password');
    h.seed();
    if (failure === 'storage') h.write = async () => { throw new Error('Storage unavailable'); };
    h.route = async endpoint => {
      if (endpoint === '/auth/refresh') {
        if (failure === 'rejected') return response(401, { message: 'Expired' });
        return response(200, { data: auth('rotated') });
      }
      return response(401, { message: 'Unauthorized' });
    };
    const result = await h.session.getSnapshot().client.get('/dashboard');
    await tick();
    assert.equal(result.success, false);
    assert.equal(h.session.getSnapshot().user, null);
    assert.equal(h.saved, null);
    assert.equal(h.render().slotRenders, 0);
    assert.equal(h.session.getSnapshot().queryClient.getQueryCache().getAll().length, 0);
  });
}

test('successful concurrent refresh shares one request and preserves the current session/cache', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  const current = h.session.getSnapshot();
  const refreshed = deferred();
  h.route = (endpoint, options) => {
    if (endpoint === '/auth/refresh') return refreshed.promise;
    return options.headers.Authorization === 'Bearer rotated-access'
      ? response(200, { data: { owner: 'A' } }) : response(401, {});
  };
  const requests = [current.client.get('/dashboard'), current.client.get('/kyc/me')];
  await tick();
  assert.equal(h.calls.filter(c => c.endpoint === '/auth/refresh').length, 1);
  refreshed.resolve(response(200, { data: auth('rotated') }));
  for (const result of await Promise.all(requests)) assert.equal(result.success, true);
  assert.equal(h.session.getSnapshot().id, current.id);
  assert.equal(current.queryClient.getQueryData(keys[0]).owner, 'A');
  assert.equal(h.saved.accessToken, 'rotated-access');
});

test('late refresh success or 401 from A cannot overwrite or sign out B', async () => {
  for (const lateStatus of [200, 401]) {
    const h = harness();
    await h.session.signIn('A', 'password');
    const delayed = deferred();
    h.route = endpoint => {
      if (endpoint === '/auth/login') return response(200, { data: auth('B') });
      if (endpoint === '/auth/refresh') return delayed.promise;
      return response(401, {});
    };
    const request = h.session.getSnapshot().client.get('/dashboard');
    await tick();
    await h.session.signIn('B', 'password');
    delayed.resolve(response(lateStatus, { data: auth('A-rotated') }));
    assert.equal((await request).success, false);
    assert.equal(h.session.getSnapshot().user.id, 'B');
    assert.equal(h.saved.accessToken, 'B-access');
  }
});

test('in-progress refresh storage write is ordered before logout deletion and B login', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  const blocked = deferred();
  h.write = async tokens => {
    if (tokens.accessToken === 'A-rotated-access') await blocked.promise;
    h.store(tokens);
  };
  h.route = endpoint => {
    if (endpoint === '/auth/login') return response(200, { data: auth('B') });
    if (endpoint === '/auth/logout') return response(200, { data: {} });
    if (endpoint === '/auth/refresh') return response(200, { data: auth('A-rotated') });
    return response(401, {});
  };
  const oldRequest = h.session.getSnapshot().client.get('/dashboard');
  await tick();
  const logout = h.session.logout();
  const login = h.session.signIn('B', 'password');
  blocked.resolve();
  await Promise.all([oldRequest, logout, login]);
  assert.equal(h.saved.accessToken, 'B-access');
  assert.equal(h.session.getSnapshot().user.id, 'B');
});

test('late login cannot restore a session after logout or a newer login', async () => {
  const h = harness();
  const delayed = deferred();
  h.route = (endpoint, options) => {
    if (endpoint === '/auth/logout') return response(200, { data: {} });
    return JSON.parse(options.body).email === 'A' ? delayed.promise : response(200, { data: auth('B') });
  };
  const oldLogin = h.session.signIn('A', 'password');
  const rejected = assert.rejects(oldLogin, /Session ended/);
  await tick();
  await h.session.logout();
  await h.session.signIn('B', 'password');
  delayed.resolve(response(200, { data: auth('A') }));
  await rejected;
  assert.equal(h.session.getSnapshot().user.id, 'B');
  assert.equal(h.saved.accessToken, 'B-access');
});

test('restoration gates protected screens; transient network failures do not erase credentials', async () => {
  const h = harness();
  h.saved = auth('A');
  assert.equal(h.render().slotRenders, 0);
  h.route = async () => { throw new Error('Offline'); };
  await h.session.refreshUser();
  assert.equal(h.render().slotRenders, 0);
  assert.match(h.render().html, /Retry/);
  assert.equal(h.saved.accessToken, 'A-access');
  h.route = () => response(200, { data: { id: 'A' } });
  await h.session.refreshUser();
  assert.equal(h.session.getSnapshot().user.id, 'A');
  assert.equal(h.render().slotRenders, 1);
});

for (const failure of ['network', 'timeout', 'server', 'rateLimit', 'malformed']) {
  test(`recoverable refresh ${failure} preserves the account and can retry successfully`, async () => {
    const h = harness();
    await h.session.signIn('A', 'password');
    h.seed();
    const original = h.session.getSnapshot();
    h.route = (endpoint, options) => {
      if (endpoint === '/auth/refresh') {
        if (failure === 'network') throw new Error('Offline');
        if (failure === 'timeout') throw new DOMException('Timed out', 'AbortError');
        if (failure === 'malformed') return response(200, { data: {} });
        return response(failure === 'rateLimit' ? 429 : 503, { message: 'Try later' });
      }
      assert.equal(options.headers.Authorization, 'Bearer A-access');
      return response(401, { message: 'Access token expired' });
    };
    assert.equal((await original.client.get('/dashboard')).success, false);
    assert.equal(h.session.getSnapshot().user.id, 'A');
    assert.equal(h.session.getSnapshot().id, original.id);
    assert.equal(h.saved.refreshToken, 'A-refresh');
    assert.equal(original.queryClient.getQueryData(keys[0]).owner, 'A');
    h.route = (endpoint, options) => {
      if (endpoint === '/auth/refresh') return response(200, { data: auth('rotated') });
      return options.headers.Authorization === 'Bearer rotated-access'
        ? response(200, { data: { owner: 'A' } }) : response(401, {});
    };
    assert.equal((await original.client.get('/dashboard')).success, true);
    assert.equal(h.saved.refreshToken, 'rotated-refresh');
    assert.equal(h.session.getSnapshot().id, original.id);
  });
}

test('revalidating an existing user during an outage retains their UI, tokens and cache', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  const original = h.session.getSnapshot();
  h.route = () => response(503, { message: 'Unavailable' });
  await h.session.refreshUser();
  assert.equal(h.session.getSnapshot().id, original.id);
  assert.equal(h.session.getSnapshot().user.id, 'A');
  assert.equal(h.saved.accessToken, 'A-access');
  assert.equal(h.render().slotRenders, 1);
  assert.equal(original.queryClient.getQueryData(keys[0]).owner, 'A');
  h.route = () => response(200, { data: { id: 'A' } });
  await h.session.refreshUser();
  assert.equal(h.session.getSnapshot().recoveryError, null);
});

test('cold-start refresh rejection clears saved tokens and does not offer network recovery', async () => {
  const h = harness();
  h.saved = auth('A');
  h.route = () => response(401, { message: 'Revoked' });
  await h.session.refreshUser();
  await tick();
  assert.equal(h.saved, null);
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.session.getSnapshot().recoveryError, null);
  assert.equal(h.render().slotRenders, 0);
});

test('ordinary 403 and network errors do not log out an authenticated user', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  const current = h.session.getSnapshot();
  h.route = () => response(403, { message: 'Forbidden' });
  assert.equal((await current.client.get('/kyc/me')).success, false);
  h.route = async () => { throw new Error('Offline'); };
  assert.equal((await current.client.get('/dashboard')).success, false);
  assert.equal(h.session.getSnapshot().id, current.id);
  assert.equal(h.session.getSnapshot().user.id, 'A');
});

test('KYC upload completes normally but a delayed upload cannot register documents in another account', async () => {
  for (const switchAccount of [false, true]) {
    const h = harness();
    await h.session.signIn('A', 'password');
    const client = h.session.getSnapshot().client;
    const uploaded = deferred();
    h.mock('expo-file-system/legacy', {
      FileSystemUploadType: { BINARY_CONTENT: 0 },
      createUploadTask: () => ({ uploadAsync: () => uploaded.promise }),
    });
    h.route = endpoint => {
      if (endpoint === '/auth/login') return response(200, { data: auth('B') });
      if (endpoint === '/kyc/documents/upload-url') {
        return response(200, { data: { uploadUrl: 'https://storage.invalid/document', objectKey: 'A/document' } });
      }
      if (endpoint === '/kyc/documents') return response(200, { data: {} });
      throw new Error(`Unexpected ${endpoint}`);
    };
    const { uploadDocument } = h.load('src/lib/upload.ts');
    const upload = uploadDocument(client, 'file://document.png', 'PAN_CARD', 'image/png');
    const result = switchAccount ? assert.rejects(upload, /Session ended/) : upload;
    await tick();
    if (switchAccount) await h.session.signIn('B', 'password');
    uploaded.resolve({ status: 200 });
    await result;
    const registrations = h.calls.filter(c => c.endpoint === '/kyc/documents');
    assert.equal(registrations.length, switchAccount ? 0 : 1);
    if (!switchAccount) assert.equal(registrations[0].headers.Authorization, 'Bearer A-access');
  }
});

test('registration and Google authentication establish isolated sessions using their existing API payloads', async () => {
  const h = harness();
  await h.session.signIn('A', 'password');
  h.seed();
  h.route = () => response(200, { data: auth('B') });
  await h.session.createAccount({ firstName: 'B', lastName: 'Test', email: 'b@example.test', password: 'password', referralCode: 'REF' });
  assert.equal(h.calls.at(-1).endpoint, '/auth/register');
  assert.equal(JSON.parse(h.calls.at(-1).body).referralCode, 'REF');
  assert.equal(h.session.getSnapshot().queryClient.getQueryCache().getAll().length, 0);
  h.seed();
  await h.session.signInWithGoogle('google-token', 'REF');
  assert.equal(h.calls.at(-1).endpoint, '/auth/google');
  assert.equal(JSON.parse(h.calls.at(-1).body).idToken, 'google-token');
  assert.equal(h.session.getSnapshot().queryClient.getQueryCache().getAll().length, 0);
});
