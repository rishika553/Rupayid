const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load({
  native = true,
  os = 'android',
  web = 'web-client',
  android = 'android-client',
  ios = 'ios-client',
} = {}) {
  const calls = [];
  const errors = [];
  const Provider = () => null;
  const filename = path.resolve(__dirname, '../src/auth/google-sign-in-button.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: {
      env: {
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: web,
        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: android,
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ios,
      },
    },
    require: (name) => {
      if (name === 'react/jsx-runtime')
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === 'react-native')
        return {
          Platform: { OS: os },
          StyleSheet: { create: (s) => s },
          Text: 'Text',
          TouchableOpacity: 'Button',
        };
      if (name === 'expo-modules-core')
        return { requireOptionalNativeModule: () => (native ? {} : null) };
      if (name === '@/ui/theme') return { colors: {}, font: {}, radius: {} };
      assert.equal(name, './google-sign-in-provider');
      calls.push('provider');
      return { GoogleSignInProvider: Provider };
    },
  });
  const props = { onError: (message) => errors.push(message), onBusyChange() {} };
  return {
    render: (extra) => exports.GoogleSignInButton({ ...props, ...extra }),
    calls,
    errors,
    Provider,
    props,
  };
}
test('Expo Go without ExpoApplication renders email-safe fallback without loading Google provider', () => {
  const h = load({ native: false });
  const button = h.render();
  assert.equal(button.type, 'Button');
  assert.equal(h.calls.length, 0);
  button.props.onPress();
  assert.match(h.errors[0], /unavailable in this Expo Go preview/);
});
test('missing web configuration cannot load the provider', () => {
  const h = load({ web: '' });
  h.render().props.onPress();
  assert.match(h.errors[0], /not configured/);
  assert.equal(h.calls.length, 0);
});
test('missing Android configuration gives an actionable fallback', () => {
  const h = load({ android: '' });
  h.render().props.onPress();
  assert.match(h.errors[0], /email sign-in/);
  assert.equal(h.calls.length, 0);
});
test('configured Android forwards existing callbacks to the unchanged provider', () => {
  const h = load();
  const result = h.render();
  assert.equal(result.type, h.Provider);
  assert.equal(result.props.onError, h.props.onError);
  assert.equal(result.props.onBusyChange, h.props.onBusyChange);
  assert.deepEqual(h.calls, ['provider']);
});
test('fallback respects disabled state during email authentication', () => {
  const h = load({ native: false });
  const result = h.render({ disabled: true });
  assert.equal(result.props.disabled, true);
  assert.equal(result.props.accessibilityState.disabled, true);
});
test('web only needs the web client and does not require an Android native module', () => {
  const h = load({ os: 'web', native: false, android: '', ios: '' });
  assert.equal(h.render().type, h.Provider);
});
test('iOS uses its own configuration before loading the provider', () => {
  assert.equal(load({ os: 'ios', ios: '' }).render().type, 'Button');
  const h = load({ os: 'ios', android: '' });
  assert.equal(h.render().type, h.Provider);
});
