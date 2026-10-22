#!/usr/bin/env node
// npm test. A temp database, the migration, the demo family, every command, and the paperwork.
// Runs on Windows and Linux with nothing installed but Node. Set TEST_DATABASE_URL to a disposable
// local database named rebuild_test to run the same checks on real Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, usage, human, cents, date, mapClass, mapTxnKind, parseArgs } from './family.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'family-office-test-'));
process.env.DATA_DIR = path.join(temp, 'db');
process.env.OUTPUT_DIR = temp;
process.env.DATABASE_URL = '';
if (process.env.TEST_DATABASE_URL) {
  const u = new URL(process.env.TEST_DATABASE_URL);
  assert(['localhost', '127.0.0.1'].includes(u.hostname) && u.pathname === '/rebuild_test', 'TEST_DATABASE_URL must be a disposable local database named rebuild_test');
  process.env.DATABASE_URL = u.href;
}

const seen = new Set();
let db;
const call = (cmd, args = [], o = {}) => { seen.add(cmd); return run(db, cmd, args, o); };
const iyNow = () => { const d = new Date(); return d.getUTCFullYear() + (d.getUTCMonth() >= 6 ? 1 : 0); };

try {
  db = await getDb();
  if (db.mode === 'postgres') await db.exec('drop schema public cascade; create schema public;');
  assert.equal((await migrate(db)).ran.length, 1);
  assert.equal((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);

  // Units
  assert.equal(cents('1,250,000.50'), 125000050);
  assert.equal(cents('$1.2m'), 120000000);
  assert.throws(() => date('2026-02-30'), /YYYY-MM-DD/);
  assert.equal(mapClass('Listed Equities'), 'listed');
  assert.equal(mapClass('Private Credit'), 'private-equity');
  assert.equal(mapTxnKind('Management Fee'), 'fee');
  assert.deepEqual(parseArgs(['value', 'art', '--value=10', '--json']).options, { value: '10', json: true });

  // Reads on the demo family
  assert.equal((await call('help')).length, Object.keys(usage).length);
  assert.equal((await call('members')).length, 4);
  assert.equal((await call('entities')).length, 4);
  assert.equal((await call('entity', ['family trust'])).holdings.length, 5);
  assert.equal((await call('structure')).length, 5);
  const lt = await call('look-through', ['graham']);
  assert.equal(lt.outright.length, 2);
  assert(lt.held_in_discretionary_trusts.some((r) => r.entity === 'Hartley Holdings Ltd'), 'the company under the trust is family money, not Graham\'s');
  assert.equal((await call('holdings')).length, 13);
  assert.equal((await call('holdings', [], { entity: 'pty', class: 'cash' })).length, 1);
  const nw = await call('net-worth');
  assert.equal(nw.rows.length, 4);
  assert(Number(nw.total_base_cents) > 2_000_000_000);
  assert.equal((await call('net-worth', [], { by: 'currency' })).rows.length, 2);
  const liq = await call('liquidity');
  assert.equal(Number(liq.calls_90_days_base_cents), 15000000 + 20000000 + Math.round(5000000 * 1.12));
  const com = await call('commitments');
  assert.equal(com.length, 2);
  const sc = com.find((c) => c.fund.startsWith('Southern Cross'));
  assert.equal(Number(sc.called_cents), 130000000);
  assert.equal(Number(sc.uncalled_cents), 70000000);
  assert.equal(String(sc.dpi), '0.19');
  assert.equal((await call('calls')).length, 3);
  assert.equal((await call('calls', [], { days: '30' })).length, 2);
  assert.equal((await call('stale')).length, 4);
  assert.equal((await call('valuations', ['jarden'])).length, 2);
  assert.equal((await call('transactions', [], { kind: 'fee' })).length, 2);
  assert.equal((await call('deadlines')).length, 4);
  assert.equal((await call('documents', ['family trust'])).length, 4);
  assert.equal((await call('trust-records')).filter((r) => r.status === 'MISSING').length, 2);
  assert.equal((await call('beneficiaries')).length, 4);
  assert.equal((await call('loans')).length, 2);

  // Division 7A: the s109E formula on the seeded loan
  const d7 = await call('div7a', ['pty ltd loan']);
  const first = d7.find((r) => r.myr_cents !== null);
  assert.equal(Number(first.opening_cents), 40000000);
  const r = first.rate_bps / 10000;
  assert(Math.abs(Number(first.myr_cents) - Math.round(40000000 * r / (1 - (1 + r) ** -7))) <= 1, 'minimum yearly repayment matches s109E');
  assert.equal(Number(first.shortfall_cents), Number(first.myr_cents) - 3000000);

  const comp = await call('compliance');
  const rules = comp.map((x) => x.rule);
  assert.equal(rules.filter((x) => x === 'TRUSTS-S45').length, 2);
  assert.equal(rules.filter((x) => x === 'TRUSTS-S51').length, 1);
  assert(comp.some((x) => x.rule === 'DIV7A-MYR' && x.severity === 'breached'));
  assert(comp.some((x) => x.rule === 'DEADLINE' && x.record.includes('Annual return')));
  if (iyNow() <= 2027) assert.equal(comp.length, 6);
  const att = await call('attention');
  assert(att.length >= 14);
  assert.equal(att[0].level, 'breached');
  assert.equal((await call('week')).length, 5);
  const ins = await call('insights');
  assert.equal(ins.length, 10);
  for (const q of ins) assert(q.rows.length > 0, `insight has rows: ${q.question}`);
  assert((await call('history', ['ward street'])).length >= 4);

  // Ambiguous names list the candidates
  await assert.rejects(() => call('holdings', [], { entity: 'hartley' }), /More than one entit/);

  // Writes
  const m = await call('add-member', [], { name: 'Mia Hartley', relationship: 'Granddaughter', born: '2015-05-01' });
  await call('add-beneficiary', ['family trust'], { member: m.name });
  assert.equal((await call('compliance')).filter((x) => x.rule === 'TRUSTS-S51').length, 2);
  await call('inform', ['family trust'], { member: 'Mia', reason: 'Minor: information given to her guardians (s53 factors considered)' });
  await call('inform', ['family trust'], { member: 'James', on: '2026-10-01' });
  assert.equal((await call('compliance')).filter((x) => x.rule === 'TRUSTS-S51').length, 0);

  await call('add-document', ['family trust'], { kind: 'trustee-decisions', title: 'Trustee minutes book', dated: '2026-06-30' });
  await call('add-document', ['family trust'], { kind: 'memorandum-of-wishes', title: 'None made: recorded by the trustees' });
  assert.equal((await call('trust-records')).filter((x) => x.status === 'MISSING').length, 0);

  const e = await call('add-entity', [], { name: 'Kea Ventures Ltd', kind: 'company' });
  await call('own', ['kea ventures'], { owner: 'Olivia', percent: '60' });
  await assert.rejects(() => call('own', ['kea ventures'], { owner: 'James', percent: '50' }), /110% owned/);
  await call('add-account', ['kea'], { provider: 'BNZ', name: 'Operating', kind: 'bank' });
  await call('add-asset', ['kea'], { name: 'BNZ operating', class: 'cash', account: 'Operating', value: '80000', 'as-of': new Date().toISOString().slice(0, 10) });
  assert.equal((await call('look-through', ['olivia'])).outright.length, 1);
  await call('value', ['art collection'], { value: '420000', source: 'appraisal', note: 'Insurance revaluation' });
  assert.equal((await call('stale')).length, 3);
  await call('add-txn', ['kea'], { kind: 'income', amount: '1200', asset: 'BNZ operating', description: 'Interest' });
  const cm = await call('add-commitment', ['kea'], { fund: 'Pohutukawa Fund I', amount: '250000', manager: 'Pohutukawa Partners', vintage: '2026' });
  assert.equal(cm.entity_id, e.id);
  const call1 = await call('add-call', ['pohutukawa'], { amount: '50000', due: '2026-12-01', notice: '2026-11-15' });
  assert.equal(call1.status, 'noticed');
  await call('pay-call', [call1.id.slice(0, 8)], { on: '2026-11-30' });
  await assert.rejects(() => call('pay-call', [call1.id]), /already paid/);
  const dl = await call('add-deadline', ['kea'], { title: 'Kea annual return', due: '2027-03-31', rule: 'Companies Act 1993 (NZ) s214' });
  await call('done', [dl.id.slice(0, 8)], { on: '2027-03-01' });
  await call('done', ['annual return to the companies office']);
  assert.equal((await call('compliance')).filter((x) => x.rule === 'DEADLINE').length, 0);
  await assert.rejects(() => call('add-loan', [], { name: 'Bad', kind: 'div7a', lender: 'kea', borrower: 'olivia', amount: '1000', made: '2026-01-01' }), /Australian private company/);
  await call('add-loan', [], { name: 'No paperwork', kind: 'div7a', lender: 'pty ltd', borrower: 'susan', amount: '20000', made: '2026-08-01', currency: 'AUD' });
  assert(((await call('compliance')).some((x) => x.rule === 'DIV7A-S109N')));
  await call('repay', ['pty ltd loan'], { amount: '200000' });
  await call('set-rate', [], { currency: 'AUD', rate: '1.1' });
  await call('log', ['ward street'], { note: 'Valuer booked', actor: 'Office manager' });
  assert((await call('history', ['ward street'])).some((h) => h.detail === 'Valuer booked'));

  // Dry run changes nothing
  const before = (await call('members')).length;
  await call('add-member', [], { name: 'Nobody', 'dry-run': true });
  assert.equal((await call('members')).length, before);

  // Import from Asora: new rows, then the same files again change nothing
  const imp = await call('import', ['asora'], { holdings: path.join(REPO_ROOT, 'examples', 'asora-holdings.csv'), transactions: path.join(REPO_ROOT, 'examples', 'asora-transactions.csv'), actor: 'test' });
  assert.equal(imp.entities, 1);
  assert.equal(imp.valuations, 5);
  assert.equal(imp.transactions, 3);
  const again = await call('import', ['asora'], { holdings: path.join(REPO_ROOT, 'examples', 'asora-holdings.csv'), transactions: path.join(REPO_ROOT, 'examples', 'asora-transactions.csv') });
  assert.equal(again.valuations + again.transactions, 0);
  assert.equal(again.unchanged, 8);
  assert.equal((await call('imports')).length, 2);
  assert.equal((await db.query("select asset_class from assets where name = 'Harbour Credit Fund'"))[0].asset_class, 'private-equity');
  assert.equal((await call('valuations', ['jarden'])).length, 3);

  const ex = await call('export', [], { out: path.join(temp, 'export.json') });
  assert(ex.records > 100);
  assert.equal(JSON.parse(fs.readFileSync(ex.file, 'utf8')).format, 1);

  // Every command ran
  const missing = Object.keys(usage).filter((c) => !seen.has(c));
  assert.deepEqual(missing, [], `commands not exercised: ${missing.join(', ')}`);
  assert(human(await call('net-worth')).includes('$'));
} finally {
  if (db) await db.close();
}

// Paperwork and views render from the same database
const env = { ...process.env };
for (const script of ['docs', 'view']) {
  const res = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', `${script}.mjs`)], { env, encoding: 'utf8' });
  assert.equal(res.status, 0, `${script} failed: ${res.stderr}`);
}
const docs = fs.readdirSync(path.join(temp, 'docs-out'));
for (const d of JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'))) assert(docs.includes(d.name) && fs.readdirSync(path.join(temp, 'docs-out', d.name)).length, `${d.name} rendered`);
assert(fs.readdirSync(path.join(temp, 'views')).includes('week.html'));
const reportDir = path.join(temp, 'docs-out', 'family-wealth-report');
const report = fs.readFileSync(path.join(reportDir, fs.readdirSync(reportDir)[0]), 'utf8');
assert(report.includes('Hartley'), 'report carries the family data');

fs.rmSync(temp, { recursive: true, force: true });
console.log(`PASS: ${Object.keys(usage).length} commands, demo family, compliance, Asora import, documents and views`);
