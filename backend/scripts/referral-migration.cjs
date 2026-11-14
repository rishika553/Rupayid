// Uses the configured database through its direct connection; never prints credentials.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const action = process.argv[2] || 'status';
if (!['status', 'deploy'].includes(action)) throw new Error('Use status or deploy');
const root = path.resolve(__dirname, '..');
const envText = fs.readFileSync(path.join(root, '.env'), 'utf8');
const match = envText.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)/m);
const url = new URL(process.env.DATABASE_URL || match?.[1]);
url.hostname = url.hostname.replace('-pooler.', '.');
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', action], {
  cwd: root, env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'inherit', windowsHide: true,
});
process.exitCode = result.status ?? 1;
