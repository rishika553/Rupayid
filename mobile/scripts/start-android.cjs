// Expo Go on a connected Android emulator/device, using ADB reverse.
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const executable = process.platform === 'win32' ? 'adb.exe' : 'adb';
const sdkRoots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')];
const adb = process.env.ADB_PATH || sdkRoots.filter(Boolean)
  .map(root => path.join(root, 'platform-tools', executable)).find(file => fs.existsSync(file)) || executable;
const androidSdk = path.isAbsolute(adb) ? path.dirname(path.dirname(adb)) : undefined;
for (const port of [3001, 8081]) {
  const result = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit', timeout: 15000 });
  if (result.error || result.status !== 0) {
    console.error('ADB reverse failed. Start one Android device and set ANDROID_HOME or ADB_PATH to your SDK.');
    process.exit(1);
  }
}
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--go', '--android', '--lan', '--port', '8081'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(androidSdk ? { ANDROID_HOME: androidSdk } : {}),
    EXPO_PUBLIC_API_URL: 'http://127.0.0.1:3001/api/v1',
    REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
  },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
