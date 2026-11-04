const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadStorage(failRefreshWrite = false) {
  const values = new Map();
  const secureStore = {
    getItemAsync: async key => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (failRefreshWrite && key.endsWith('refreshToken')) throw new Error('Storage unavailable');
      values.set(key, value);
    },
    deleteItemAsync: async key => { values.delete(key); },
  };
  const filename = path.resolve(__dirname, '../src/auth/secure-storage.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.equal(name, 'expo-secure-store');
      return secureStore;
    },
  });
  return { storage: exports, values };
}

test('persists and clears both tokens using SecureStore', async () => {
  const { storage } = loadStorage();
  assert.equal(await storage.readAuth(), null);
  await storage.writeAuth({ accessToken: 'test-access', refreshToken: 'test-refresh' });
  const result = await storage.readAuth();
  assert.equal(result.accessToken, 'test-access');
  assert.equal(result.refreshToken, 'test-refresh');
  await storage.clearAuth();
  assert.equal(await storage.readAuth(), null);
});

test('does not report successful login when persistence fails; removes partial tokens', async () => {
  const { storage, values } = loadStorage(true);
  await assert.rejects(storage.writeAuth({ accessToken: 'test-access', refreshToken: 'test-refresh' }), /Storage unavailable/);
  assert.equal(values.size, 0);
  assert.equal(await storage.readAuth(), null);
});

test('does not restore an incomplete token pair', async () => {
  const { storage, values } = loadStorage();
  values.set('rupayaid.accessToken', 'test-access');
  assert.equal(await storage.readAuth(), null);
});
