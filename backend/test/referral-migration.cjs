// Isolated PostgreSQL only. Start a disposable local server on port 55439.
// Run after `npm run build`: node test/referral-migration.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { ReferralsService } = require('../dist/src/modules/referrals/referrals.service');

async function main() {
  const schema = `referral_test_${Date.now()}`;
  const url = `postgresql://postgres@127.0.0.1:55439/postgres?schema=${schema}`;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rupayaid-referral-migration-'));
  const prismaRoot = path.resolve(__dirname, '../prisma');
  fs.copyFileSync(path.join(prismaRoot, 'schema.prisma'), path.join(root, 'schema.prisma'));
  fs.mkdirSync(path.join(root, 'migrations'));
  const latest = '20261110093000_referral_phase1';
  for (const name of fs.readdirSync(path.join(prismaRoot, 'migrations'))) {
    if (name === latest) continue;
    fs.cpSync(path.join(prismaRoot, 'migrations', name), path.join(root, 'migrations', name), { recursive: true });
  }
  function migrate() {
    const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(root, 'schema.prisma')], {
      env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', windowsHide: true,
    });
    if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    migrate();
    const owner = await db.user.create({ data: { email: 'referral-owner@example.test', firstName: 'Test', lastName: 'Owner', passwordHash: 'not-a-login', status: 'ACTIVE' } });
    const other = await db.user.create({ data: { email: 'referral-other@example.test', firstName: 'Test', lastName: 'Other', passwordHash: 'not-a-login', status: 'ACTIVE' } });
    await db.$executeRaw`INSERT INTO "referrals" (id, "referrerId", "refereeId", code, status, "updatedAt") VALUES ('legacy-referral', ${owner.id}, ${other.id}, 'RAP-LEGACY23', 'ACCEPTED', NOW())`;
    fs.cpSync(path.join(prismaRoot, 'migrations', latest), path.join(root, 'migrations', latest), { recursive: true });
    migrate();
    assert.equal((await db.referral.findUnique({ where: { id: 'legacy-referral' } })).status, 'ACCEPTED');
    const service = new ReferralsService(db, { log: async () => undefined });
    const codes = await Promise.all([service.provisionForUser(owner.id), service.provisionForUser(owner.id)]);
    assert.equal(codes[0].referralCode, codes[1].referralCode);
    const input = { referredName: 'Test Contact', referredPhone: '+919876543210', consentConfirmed: true };
    const results = await Promise.allSettled([service.submit(owner.id, input), service.submit(owner.id, input)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.getStatus(), 409);
    assert.equal((await service.listMine(other.id, { page: 1, limit: 20 })).total, 0);
    assert.equal((await service.statistics(owner.id)).pending, 1);
    const listing = await service.listAdmin({ page: 1, limit: 20, search: '98765', status: 'PENDING' });
    assert.equal(listing.total, 1);
    assert.equal(listing.data[0].referrer.id, owner.id);
    for (const status of ['CONTACTED', 'CONVERTED', 'REJECTED', 'PENDING']) {
      await service.updateStatus(listing.data[0].id, { status }, other.id);
      assert.equal((await db.referral.findUnique({ where: { id: listing.data[0].id } })).status, status);
    }
    assert.equal(await db.auditLog.count({ where: { entityId: listing.data[0].id } }), 4);
    assert.equal((await service.getMine(owner.id)).referredCount, 1);
    await assert.rejects(db.referral.create({ data: { referrerId: owner.id, code: codes[0].referralCode, referredName: 'No Consent', referredPhone: '+919876543211' } }));
    console.log('PASS: full migration history, existing referral preservation, concurrent code generation, duplicate race, owner isolation, statistics, admin search, all statuses, audit, consent constraint, legacy API.');
  } finally {
    // The schema is generated here on the hard-coded disposable localhost server.
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
