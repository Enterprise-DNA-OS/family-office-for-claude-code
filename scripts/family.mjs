#!/usr/bin/env node
// The one CLI. Every slash command in .claude/commands runs one of these.
//
//   npm run family -- <command> [args] [--flags] [--json]
//   npm run family -- help
//
// Records match by exact name, then id prefix, then part of the name (case-insensitive).
// More than one match lists the candidates and exits 1. Amounts are typed in dollars
// (--amount=150000 or 150000.50) and stored as cents. Money in is positive, money out negative.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { table as textTable, money } from './lib/format.mjs';

export const usage = {
  help: 'Show every command',
  members: 'Family members',
  entities: 'Trusts, companies and personal holdings',
  entity: 'ENTITY: one entity with owners, holdings, deadlines and documents',
  structure: 'Who owns which entity, and on what basis',
  'look-through': '[MEMBER]: what each person owns through fixed shares, and what sits in discretionary trusts',
  holdings: '[--entity=ENTITY] [--class=CLASS]: every asset at its latest value',
  'net-worth': '[--by=entity|class|liquidity|currency]: the total in the base currency',
  liquidity: 'Cash and daily-liquid assets against capital calls and uncalled commitments',
  commitments: 'Private fund commitments: committed, called, uncalled, distributed, DPI, TVPI',
  calls: '[--days=N]: capital calls not yet paid',
  stale: 'Assets whose last valuation is older than the house policy allows',
  valuations: 'ASSET: valuation history',
  transactions: '[--entity=ENTITY] [--kind=KIND] [--days=N]',
  deadlines: '[--days=N]: open filing and review dates',
  documents: '[ENTITY]: papers on file',
  'trust-records': 'Trusts Act 2019 (NZ) s45 core documents, trust by trust',
  beneficiaries: '[ENTITY]: who benefits, and whether basic trust information was given',
  loans: 'Loans between the family entities and people',
  div7a: '[LOAN]: Division 7A minimum yearly repayments, year by year',
  compliance: 'Every legal check, with the rule it comes from',
  attention: 'What needs a person this week',
  insights: 'Ten questions a portfolio dashboard does not answer',
  week: 'The week in five numbers',
  history: 'ENTITY or ASSET: everything recorded against it',
  'add-member': '--name=NAME [--relationship=TEXT] [--born=DATE]',
  'add-entity': '--name=NAME --kind=personal|trust|company|partnership|foundation [--jurisdiction=NZ|AU|OTHER] [--trustees=TEXT] [--registration=TEXT]',
  own: 'ENTITY --owner=MEMBER_OR_ENTITY --percent=N [--basis=shares|units|discretionary]',
  'add-beneficiary': 'TRUST --member=MEMBER [--informed-on=DATE]',
  inform: 'TRUST --member=MEMBER [--on=DATE] [--reason=TEXT]: record basic trust information given, or why not',
  'add-account': 'ENTITY --provider=NAME --name=NAME [--kind=bank|custody|platform|fund|direct] [--currency=NZD]',
  'add-asset': 'ENTITY --name=NAME --class=CLASS [--liquidity=daily|monthly|locked|illiquid] [--currency=NZD] [--account=ACCOUNT] [--value=AMOUNT --as-of=DATE]',
  value: 'ASSET --value=AMOUNT [--as-of=DATE] [--source=statement|manager|appraisal|board|estimate] [--note=TEXT]',
  'add-txn': 'ENTITY --kind=KIND --amount=AMOUNT [--asset=ASSET] [--on=DATE] [--currency=NZD] [--description=TEXT]',
  'add-commitment': 'ENTITY --fund=NAME --amount=AMOUNT [--manager=NAME] [--currency=NZD] [--vintage=YEAR]',
  'add-call': 'FUND --amount=AMOUNT --due=DATE [--notice=DATE] [--status=expected|noticed]',
  'pay-call': 'CALL_ID [--on=DATE]',
  'add-deadline': 'ENTITY --title=TEXT --due=DATE [--rule=TEXT]',
  done: 'DEADLINE [--on=DATE]',
  'add-document': 'ENTITY --kind=KIND --title=TEXT [--dated=DATE] [--location=TEXT]',
  'add-loan': '--name=NAME --lender=ENTITY --borrower=MEMBER_OR_ENTITY --amount=AMOUNT --made=DATE [--kind=div7a|related-party|bank] [--term=7] [--agreement=DATE] [--currency=NZD]',
  repay: 'LOAN --amount=AMOUNT [--on=DATE]',
  'set-rate': '--currency=AUD --rate=N [--as-of=DATE] [--source=TEXT]: 1 unit = N base currency',
  log: 'ENTITY or ASSET --note=TEXT [--actor=NAME]',
  import: 'asora --holdings=FILE.csv [--transactions=FILE.csv] [--as-of=DATE] [--map=FILE.json] [--dry-run]',
  imports: 'Import receipts',
  export: '[--out=FILE.json]: every record as JSON',
};

const WRITES = new Set(['add-member', 'add-entity', 'own', 'add-beneficiary', 'inform', 'add-account', 'add-asset', 'value', 'add-txn',
  'add-commitment', 'add-call', 'pay-call', 'add-deadline', 'done', 'add-document', 'add-loan', 'repay', 'set-rate', 'log', 'import']);

export class Ambiguous extends Error {}

const today = () => new Date().toISOString().slice(0, 10);
function need(v, label) {
  if (v === undefined || v === null || v === true || String(v).trim() === '') throw new Error(`${label} is required`);
  return String(v).trim();
}
export function date(v, label = 'date') {
  const s = need(v, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) throw new Error(`${label} must be YYYY-MM-DD`);
  return s;
}
// "150000", "150,000.50", "$1.2m" -> cents
export function cents(v, label = 'amount') {
  let s = need(v, label).replace(/[$,\s]/g, '').toLowerCase();
  let mult = 1;
  if (s.endsWith('m')) { mult = 1e6; s = s.slice(0, -1); } else if (s.endsWith('k')) { mult = 1e3; s = s.slice(0, -1); }
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`${label} must be a number`);
  return Math.round(Number(s) * mult * 100);
}
const pct = (v) => { const n = Number(need(v, 'percent')); if (!(n > 0 && n <= 100)) throw new Error('percent must be over 0 and at most 100'); return n; };
const oneOf = (v, list, label) => { const s = need(v, label); if (!list.includes(s)) throw new Error(`${label} must be one of ${list.join(', ')}`); return s; };

const KINDS = {
  members: { label: 'name' },
  entities: { label: 'name' },
  assets: { label: 'name' },
  accounts: { label: 'name' },
  loans: { label: 'name' },
  deadlines: { label: 'title' },
  capital_calls: { label: 'id::text' },
};

// Exact name, then id prefix, then part of the name.
export async function resolve(db, kind, value) {
  const k = KINDS[kind];
  if (!k) throw new Error(`Unknown record kind ${kind}`);
  const v = need(value, kind.replace(/s$/, '').replace('_', ' '));
  const tries = [
    [`lower(${k.label}) = lower($1)`, v],
    ['starts_with(id::text, lower($1))', v],
    [`${k.label} ilike $1`, `%${v.replace(/[%_]/g, '')}%`],
  ];
  for (const [where, param] of tries) {
    const rows = await db.query(`select id, ${k.label} as label from ${kind} where ${where} order by ${k.label} limit 20`, [param]);
    if (rows.length === 1) return (await db.query(`select * from ${kind} where id = $1`, [rows[0].id]))[0];
    if (rows.length > 1) throw new Ambiguous(`More than one ${kind.replace(/s$/, '')} matches "${v}":\n${rows.map((r) => `  ${r.id.slice(0, 8)}  ${r.label}`).join('\n')}`);
  }
  throw new Error(`No ${kind.replace(/s$/, '').replace('_', ' ')} matches "${v}"`);
}
// A member or an entity, for owners and borrowers.
async function party(db, value) {
  try { return { member: await resolve(db, 'members', value) }; } catch (e) { if (e instanceof Ambiguous) throw e; }
  return { entity: await resolve(db, 'entities', value) };
}
// A fund is the asset behind a commitment.
async function fund(db, value) {
  const asset = await resolve(db, 'assets', value);
  const c = (await db.query('select * from commitments where asset_id = $1', [asset.id]))[0];
  if (!c) throw new Error(`${asset.name} has no commitment recorded (add-commitment first)`);
  return { asset, commitment: c };
}

async function base(db) {
  return (await db.query('select code from base_currency'))[0].code;
}

export async function run(db, cmd, args = [], o = {}) {
  if (!Object.hasOwn(usage, cmd)) throw new Error(`Unknown command "${cmd}". Run: npm run family -- help`);
  if (!WRITES.has(cmd)) return execute(db, cmd, args, o);
  await db.exec('BEGIN');
  try {
    const result = await execute(db, cmd, args, o);
    await db.exec(o['dry-run'] ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

async function execute(db, cmd, args, o) {
  const q = (sql, p = []) => db.query(sql, p);
  const days = o.days !== undefined ? Number(o.days) : null;
  switch (cmd) {
    case 'help':
      return Object.entries(usage).map(([command, what]) => ({ command, what }));

    case 'members':
      return q(`select m.name, m.relationship, m.born,
                  (select string_agg(e.name, ', ' order by e.name) from beneficiaries b join entities e on e.id = b.entity_id where b.member_id = m.id) as beneficiary_of
                from members m order by m.born nulls last, m.name`);

    case 'entities':
      return q(`select e.name, e.kind, e.jurisdiction, e.balance_date, coalesce(n.assets, 0) as assets, n.value_base_cents
                from entities e left join net_worth_by_entity n on n.entity = e.name
                where e.status = 'active' order by e.kind, e.name`);

    case 'entity': {
      const e = await resolve(db, 'entities', args[0]);
      return {
        entity: e,
        owners: await q(`select coalesce(m.name, oe.name) as owner, o.percent, o.basis from ownership o
                         left join members m on m.id = o.owner_member_id left join entities oe on oe.id = o.owner_entity_id
                         where o.owned_entity_id = $1 order by o.percent desc`, [e.id]),
        holdings: await q('select asset, asset_class, currency, value_cents, as_of, value_base_cents from holdings where entity_id = $1 order by value_base_cents desc nulls last', [e.id]),
        deadlines: await q('select title, due_date, rule from deadlines where entity_id = $1 and done_on is null order by due_date', [e.id]),
        documents: await q('select kind, title, dated, location from documents where entity_id = $1 order by kind', [e.id]),
      };
    }

    case 'structure':
      return q(`select coalesce(m.name, oe.name) as owner, case when m.id is not null then 'person' else oe.kind end as owner_kind,
                       e.name as owns, o.percent, o.basis
                from ownership o join entities e on e.id = o.owned_entity_id
                left join members m on m.id = o.owner_member_id left join entities oe on oe.id = o.owner_entity_id
                order by owns, o.percent desc`);

    case 'look-through': {
      const member = args[0] ? await resolve(db, 'members', args[0]) : null;
      const outright = await q(`select l.member, l.entity, round(l.share * 100, 2) as percent,
                                       round(coalesce(n.value_base_cents, 0) * l.share)::bigint as share_base_cents
                                from member_look_through l left join net_worth_by_entity n on n.entity = l.entity
                                where ($1::uuid is null or l.member_id = $1) order by l.member, share_base_cents desc`, [member?.id || null]);
      const inTrust = await q(`select d.trust, case when d.entity = d.trust then 'held by the trust itself' else d.entity end as entity, round(d.share * 100, 2) as percent,
                                      round(coalesce(n.value_base_cents, 0) * d.share)::bigint as share_base_cents,
                                      (select string_agg(m.name, ', ' order by m.name) from beneficiaries b join members m on m.id = b.member_id
                                         join entities t on t.id = b.entity_id where t.name = d.trust) as beneficiaries
                               from discretionary_entities d left join net_worth_by_entity n on n.entity = d.entity
                               order by d.trust, share_base_cents desc`);
      const totals = await q(`select member, sum(share_base_cents)::bigint as outright_base_cents from (
                                select l.member, l.member_id, round(coalesce(n.value_base_cents, 0) * l.share) as share_base_cents
                                from member_look_through l left join net_worth_by_entity n on n.entity = l.entity) x
                              where ($1::uuid is null or member_id = $1) group by member order by outright_base_cents desc`, [member?.id || null]);
      return { base_currency: await base(db), totals, outright, held_in_discretionary_trusts: inTrust };
    }

    case 'holdings': {
      const ent = o.entity ? await resolve(db, 'entities', o.entity) : null;
      return q(`select asset, entity, asset_class, liquidity, currency, value_cents, as_of, value_base_cents from holdings
                where ($1::uuid is null or entity_id = $1) and ($2::text is null or asset_class = $2)
                order by value_base_cents desc nulls last`, [ent?.id || null, o.class || null]);
    }

    case 'net-worth': {
      const by = o.by || 'entity';
      const col = { entity: 'entity', class: 'asset_class', liquidity: 'liquidity', currency: 'currency' }[by];
      if (!col) throw new Error('--by must be entity, class, liquidity or currency');
      const rows = await q(`select ${col} as ${by === 'class' ? 'asset_class' : by}, count(*)::int as assets, sum(value_base_cents)::bigint as value_base_cents,
                                   round(100.0 * sum(value_base_cents) / nullif((select sum(value_base_cents) from holdings), 0), 1) as percent
                            from holdings group by ${col} order by value_base_cents desc nulls last`);
      const total = (await q('select sum(value_base_cents)::bigint as total from holdings'))[0].total;
      return { base_currency: await base(db), total_base_cents: total, rows };
    }

    case 'liquidity': {
      const l = (await q('select * from liquidity'))[0];
      const reachable = Number(l.cash_base_cents) + Number(l.daily_liquid_base_cents);
      return {
        base_currency: await base(db), ...l,
        cash_cover_12_months: Number(l.calls_12_months_base_cents) ? Math.round((Number(l.cash_base_cents) / Number(l.calls_12_months_base_cents)) * 100) / 100 : null,
        reachable_cover_uncalled: Number(l.uncalled_base_cents) ? Math.round((reachable / Number(l.uncalled_base_cents)) * 100) / 100 : null,
      };
    }

    case 'commitments':
      return q('select fund, entity, manager, currency, vintage, committed_cents, called_cents, uncalled_cents, distributed_cents, nav_cents, nav_as_of, dpi, tvpi from commitment_status order by entity, fund');

    case 'calls':
      return q(`select substr(id::text, 1, 8) as id, fund, entity, currency, amount_cents, status, notice_date, due_date, days_left
                from open_calls where ($1::int is null or days_left <= $1) order by due_date`, [days]);

    case 'stale':
      return q('select asset, entity, asset_class, as_of, age_days, max_age_days, value_base_cents from stale_valuations order by age_days desc nulls first');

    case 'valuations': {
      const a = await resolve(db, 'assets', args[0]);
      return q('select as_of, value_cents, source, note, $2::text as currency from valuations where asset_id = $1 order by as_of desc', [a.id, a.currency]);
    }

    case 'transactions': {
      const ent = o.entity ? await resolve(db, 'entities', o.entity) : null;
      return q(`select t.occurred_on, e.name as entity, a.name as asset, t.kind, t.currency, t.amount_cents, t.description
                from transactions t join entities e on e.id = t.entity_id left join assets a on a.id = t.asset_id
                where ($1::uuid is null or t.entity_id = $1) and ($2::text is null or t.kind = $2)
                  and ($3::int is null or t.occurred_on >= current_date - $3::int)
                order by t.occurred_on desc`, [ent?.id || null, o.kind || null, days]);
    }

    case 'deadlines':
      return q(`select substr(d.id::text, 1, 8) as id, e.name as entity, d.title, d.due_date, (d.due_date - current_date) as days_left, d.rule
                from deadlines d join entities e on e.id = d.entity_id
                where d.done_on is null and ($1::int is null or d.due_date <= current_date + $1::int) order by d.due_date`, [days]);

    case 'documents': {
      const ent = args[0] ? await resolve(db, 'entities', args[0]) : null;
      return q(`select e.name as entity, d.kind, d.title, d.dated, d.location from documents d join entities e on e.id = d.entity_id
                where ($1::uuid is null or d.entity_id = $1) order by e.name, d.kind`, [ent?.id || null]);
    }

    case 'trust-records':
      return q(`select e.name as trust, r.kind, r.rule,
                       case when d.id is null then 'MISSING' else 'on file' end as status, d.title, d.dated, d.location
                from entities e join required_documents r on r.jurisdiction = e.jurisdiction and r.entity_kind = e.kind
                left join lateral (select * from documents x where x.entity_id = e.id and x.kind = r.kind order by x.dated desc nulls last limit 1) d on true
                where e.status = 'active' order by e.name, status desc, r.rule`);

    case 'beneficiaries': {
      const ent = args[0] ? await resolve(db, 'entities', args[0]) : null;
      return q(`select e.name as trust, m.name as beneficiary, b.informed_on, b.not_informed_reason
                from beneficiaries b join entities e on e.id = b.entity_id join members m on m.id = b.member_id
                where ($1::uuid is null or b.entity_id = $1) order by e.name, m.name`, [ent?.id || null]);
    }

    case 'loans':
      return q(`select l.name, l.kind, le.name as lender, coalesce(bm.name, be.name) as borrower, l.currency, l.principal_cents,
                       coalesce((select sum(amount_cents) from loan_repayments r where r.loan_id = l.id), 0)::bigint as repaid_cents,
                       l.made_on, l.term_years, l.agreement_on
                from loans l join entities le on le.id = l.lender_entity_id
                left join members bm on bm.id = l.borrower_member_id left join entities be on be.id = l.borrower_entity_id
                order by l.made_on`);

    case 'div7a': {
      const loan = args[0] ? await resolve(db, 'loans', args[0]) : null;
      return q(`select loan, year_label as income_year, currency, opening_cents, rate_bps, myr_cents, repaid_cents, shortfall_cents, closing_cents
                from div7a_schedule where ($1::uuid is null or loan_id = $1) order by loan, income_year`, [loan?.id || null]);
    }

    case 'compliance':
      return q(`select rule, record, issue, severity, source from compliance_findings
                order by case severity when 'breached' then 0 when 'due soon' then 1 when 'due' then 2 else 3 end, rule, record`);

    case 'attention':
      return q(`select level, what, record, issue, source from attention
                order by case level when 'breached' then 0 when 'overdue' then 1 when 'due soon' then 2 when 'stale' then 3 else 4 end, what, record`);

    case 'week':
      return q('select item, value from this_week');

    case 'insights':
      return insights(db);

    case 'history': {
      let ent = null, asset = null;
      try { ent = await resolve(db, 'entities', args[0]); } catch (e) { if (e instanceof Ambiguous) throw e; asset = await resolve(db, 'assets', args[0]); }
      const id = ent?.id || asset.id;
      return q(`select * from (
                  select at::date as on_date, 'note' as type, note as detail from activity where entity_id = $1 or asset_id = $1
                  union all select as_of, 'valuation', value_cents / 100 || ' (' || source || ')' from valuations where asset_id = $1
                  union all select occurred_on, kind, amount_cents / 100 || ' ' || currency || ' ' || description from transactions where entity_id = $1 or asset_id = $1
                  union all select coalesce(done_on, due_date), case when done_on is null then 'deadline' else 'deadline done' end, title from deadlines where entity_id = $1
                  union all select dated, 'document', kind || ': ' || title from documents where entity_id = $1
                ) h order by on_date desc nulls last limit 60`, [id]);
    }

    // ------------------------------------------------------------ writes

    case 'add-member':
      return (await q('insert into members (name, relationship, born) values ($1, $2, $3) returning *',
        [need(o.name, 'name'), o.relationship || '', o.born ? date(o.born, 'born') : null]))[0];

    case 'add-entity':
      return (await q('insert into entities (name, kind, jurisdiction, trustees, registration) values ($1, $2, $3, $4, $5) returning *',
        [need(o.name, 'name'), oneOf(o.kind, ['personal', 'trust', 'company', 'partnership', 'foundation'], 'kind'),
          o.jurisdiction ? oneOf(o.jurisdiction, ['NZ', 'AU', 'OTHER'], 'jurisdiction') : 'NZ', o.trustees || '', o.registration || '']))[0];

    case 'own': {
      const owned = await resolve(db, 'entities', args[0]);
      const owner = await party(db, o.owner);
      if (owner.entity?.id === owned.id) throw new Error('An entity cannot own itself');
      const basis = o.basis ? oneOf(o.basis, ['shares', 'units', 'discretionary'], 'basis') : 'shares';
      const total = (await q('select coalesce(sum(percent), 0)::float as t from ownership where owned_entity_id = $1 and basis <> \'discretionary\'', [owned.id]))[0].t;
      if (basis !== 'discretionary' && total + pct(o.percent) > 100.0001) throw new Error(`${owned.name} would be ${total + pct(o.percent)}% owned`);
      return (await q('insert into ownership (owner_member_id, owner_entity_id, owned_entity_id, percent, basis) values ($1, $2, $3, $4, $5) returning *',
        [owner.member?.id || null, owner.entity?.id || null, owned.id, pct(o.percent), basis]))[0];
    }

    case 'add-beneficiary': {
      const t = await resolve(db, 'entities', args[0]);
      if (t.kind !== 'trust') throw new Error(`${t.name} is not a trust`);
      const m = await resolve(db, 'members', o.member);
      return (await q('insert into beneficiaries (entity_id, member_id, informed_on) values ($1, $2, $3) returning *',
        [t.id, m.id, o['informed-on'] ? date(o['informed-on'], 'informed-on') : null]))[0];
    }

    case 'inform': {
      const t = await resolve(db, 'entities', args[0]);
      const m = await resolve(db, 'members', o.member);
      const rows = o.reason
        ? await q('update beneficiaries set not_informed_reason = $3 where entity_id = $1 and member_id = $2 returning *', [t.id, m.id, need(o.reason, 'reason')])
        : await q('update beneficiaries set informed_on = $3 where entity_id = $1 and member_id = $2 returning *', [t.id, m.id, o.on ? date(o.on, 'on') : today()]);
      if (!rows.length) throw new Error(`${m.name} is not recorded as a beneficiary of ${t.name}`);
      return rows[0];
    }

    case 'add-account': {
      const e = await resolve(db, 'entities', args[0]);
      return (await q('insert into accounts (entity_id, provider, name, kind, currency) values ($1, $2, $3, $4, $5) returning *',
        [e.id, need(o.provider, 'provider'), need(o.name, 'name'), o.kind ? oneOf(o.kind, ['bank', 'custody', 'platform', 'fund', 'direct'], 'kind') : 'custody', (o.currency || 'NZD').toUpperCase()]))[0];
    }

    case 'add-asset': {
      const e = await resolve(db, 'entities', args[0]);
      const account = o.account ? await resolve(db, 'accounts', o.account) : null;
      const a = (await q('insert into assets (entity_id, account_id, name, asset_class, liquidity, currency) values ($1, $2, $3, $4, $5, $6) returning *',
        [e.id, account?.id || null, need(o.name, 'name'), need(o.class, 'class'), o.liquidity || 'daily', (o.currency || account?.currency || 'NZD').toUpperCase()]))[0];
      if (o.value) await q('insert into valuations (asset_id, as_of, value_cents, source) values ($1, $2, $3, $4)', [a.id, o['as-of'] ? date(o['as-of'], 'as-of') : today(), cents(o.value, 'value'), o.source || 'statement']);
      return a;
    }

    case 'value': {
      const a = await resolve(db, 'assets', args[0]);
      return (await q(`insert into valuations (asset_id, as_of, value_cents, source, note) values ($1, $2, $3, $4, $5)
                       on conflict (asset_id, as_of) do update set value_cents = excluded.value_cents, source = excluded.source, note = excluded.note
                       returning *`, [a.id, o['as-of'] ? date(o['as-of'], 'as-of') : today(), cents(o.value, 'value'),
        o.source ? oneOf(o.source, ['statement', 'manager', 'appraisal', 'board', 'estimate'], 'source') : 'statement', o.note || '']))[0];
    }

    case 'add-txn': {
      const e = await resolve(db, 'entities', args[0]);
      const a = o.asset ? await resolve(db, 'assets', o.asset) : null;
      return (await q('insert into transactions (entity_id, asset_id, occurred_on, kind, amount_cents, currency, description) values ($1, $2, $3, $4, $5, $6, $7) returning *',
        [e.id, a?.id || null, o.on ? date(o.on, 'on') : today(), need(o.kind, 'kind'), cents(o.amount), (o.currency || a?.currency || 'NZD').toUpperCase(), o.description || '']))[0];
    }

    case 'add-commitment': {
      const e = await resolve(db, 'entities', args[0]);
      const currency = (o.currency || 'NZD').toUpperCase();
      const a = (await q(`insert into assets (entity_id, name, asset_class, liquidity, currency) values ($1, $2, $3, 'locked', $4) returning *`,
        [e.id, need(o.fund, 'fund'), o.class || 'private-equity', currency]))[0];
      return (await q('insert into commitments (entity_id, asset_id, manager, committed_cents, currency, vintage) values ($1, $2, $3, $4, $5, $6) returning *',
        [e.id, a.id, o.manager || '', cents(o.amount), currency, o.vintage ? Number(o.vintage) : null]))[0];
    }

    case 'add-call': {
      const { commitment } = await fund(db, args[0]);
      return (await q('insert into capital_calls (commitment_id, notice_date, due_date, amount_cents, status) values ($1, $2, $3, $4, $5) returning *',
        [commitment.id, o.notice ? date(o.notice, 'notice') : null, date(o.due, 'due'), cents(o.amount), o.status ? oneOf(o.status, ['expected', 'noticed'], 'status') : (o.notice ? 'noticed' : 'expected')]))[0];
    }

    case 'pay-call': {
      const c = await resolve(db, 'capital_calls', args[0]);
      if (c.status === 'paid') throw new Error(`Call ${c.id.slice(0, 8)} is already paid`);
      return (await q(`update capital_calls set status = 'paid', paid_on = $2 where id = $1 returning *`, [c.id, o.on ? date(o.on, 'on') : today()]))[0];
    }

    case 'add-deadline': {
      const e = await resolve(db, 'entities', args[0]);
      return (await q('insert into deadlines (entity_id, title, due_date, rule) values ($1, $2, $3, $4) returning *', [e.id, need(o.title, 'title'), date(o.due, 'due'), o.rule || '']))[0];
    }

    case 'done': {
      const d = await resolve(db, 'deadlines', args[0]);
      return (await q('update deadlines set done_on = $2 where id = $1 returning *', [d.id, o.on ? date(o.on, 'on') : today()]))[0];
    }

    case 'add-document': {
      const e = await resolve(db, 'entities', args[0]);
      return (await q('insert into documents (entity_id, kind, title, dated, location) values ($1, $2, $3, $4, $5) returning *',
        [e.id, need(o.kind, 'kind'), need(o.title, 'title'), o.dated ? date(o.dated, 'dated') : null, o.location || '']))[0];
    }

    case 'add-loan': {
      const lender = await resolve(db, 'entities', o.lender);
      const borrower = await party(db, o.borrower);
      const kind = o.kind ? oneOf(o.kind, ['div7a', 'related-party', 'bank'], 'kind') : 'related-party';
      if (kind === 'div7a' && (lender.kind !== 'company' || lender.jurisdiction !== 'AU')) throw new Error('A Division 7A loan is made by an Australian private company');
      const term = Number(o.term || 7);
      if (kind === 'div7a' && ![7, 25].includes(term)) throw new Error('Division 7A terms are 7 years (unsecured) or 25 years (secured by a mortgage)');
      return (await q(`insert into loans (name, kind, lender_entity_id, borrower_entity_id, borrower_member_id, principal_cents, currency, made_on, term_years, agreement_on)
                       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [need(o.name, 'name'), kind, lender.id, borrower.entity?.id || null, borrower.member?.id || null, cents(o.amount), (o.currency || 'NZD').toUpperCase(),
          date(o.made, 'made'), term, o.agreement ? date(o.agreement, 'agreement') : null]))[0];
    }

    case 'repay': {
      const l = await resolve(db, 'loans', args[0]);
      return (await q('insert into loan_repayments (loan_id, paid_on, amount_cents) values ($1, $2, $3) returning *', [l.id, o.on ? date(o.on, 'on') : today(), cents(o.amount)]))[0];
    }

    case 'set-rate': {
      const rate = Number(need(o.rate, 'rate'));
      if (!(rate > 0)) throw new Error('rate must be positive');
      return (await q(`insert into fx_rates (currency, as_of, rate, source) values ($1, $2, $3, $4)
                       on conflict (currency, as_of) do update set rate = excluded.rate, source = excluded.source returning *`,
        [need(o.currency, 'currency').toUpperCase(), o['as-of'] ? date(o['as-of'], 'as-of') : today(), rate, o.source || '']))[0];
    }

    case 'log': {
      let ent = null, asset = null;
      try { ent = await resolve(db, 'entities', args[0]); } catch (e) { if (e instanceof Ambiguous) throw e; asset = await resolve(db, 'assets', args[0]); }
      return (await q('insert into activity (entity_id, asset_id, note, actor) values ($1, $2, $3, $4) returning *',
        [ent?.id || asset?.entity_id, asset?.id || null, need(o.note, 'note'), o.actor || '']))[0];
    }

    case 'import':
      return importAsora(db, args, o);

    case 'imports':
      return q('select at, source, file, inserted, unchanged, actor from imports order by at desc');

    case 'export': {
      const tables = ['settings', 'members', 'entities', 'ownership', 'beneficiaries', 'accounts', 'assets', 'valuations', 'valuation_policy', 'fx_rates',
        'transactions', 'commitments', 'capital_calls', 'loans', 'loan_repayments', 'div7a_rates', 'deadlines', 'documents', 'required_documents', 'activity', 'imports'];
      const records = {};
      for (const t of tables) records[t] = await q(`select * from ${t} order by 1`);
      const file = path.resolve(REPO_ROOT, o.out || `exports/family-office-${today()}.json`);
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file, JSON.stringify({ format: 1, exported_at: new Date().toISOString(), records }, null, 2), { mode: 0o600 });
      return { file, records: Object.values(records).reduce((n, r) => n + r.length, 0) };
    }
  }
}

// ------------------------------------------------------------ ten questions

export async function insights(db) {
  const one = async (question, sql) => ({ question, rows: await db.query(sql) });
  return [
    await one('What does each person own outright, against what sits in discretionary trusts?',
      `select 'outright: ' || member as holder, sum(round(coalesce(n.value_base_cents, 0) * l.share))::bigint as value_base_cents
         from member_look_through l left join net_worth_by_entity n on n.entity = l.entity group by member
       union all
       select 'in trust: ' || d.trust, sum(round(coalesce(n.value_base_cents, 0) * d.share))::bigint
         from discretionary_entities d left join net_worth_by_entity n on n.entity = d.entity group by d.trust
       order by 2 desc`),
    await one('How much could the funds still call, and how much of that is due in the next 12 months?',
      'select uncalled_base_cents, calls_12_months_base_cents, cash_base_cents from liquidity'),
    await one('Which fund commitments have paid back the least of what they called?',
      'select fund, currency, called_cents, distributed_cents, dpi, tvpi from commitment_status order by dpi nulls first, fund'),
    await one('What share of the family wealth cannot be sold within a month?',
      `select round(100.0 * sum(value_base_cents) filter (where liquidity in ('locked', 'illiquid')) / nullif(sum(value_base_cents), 0), 1) as illiquid_percent,
              sum(value_base_cents) filter (where liquidity in ('locked', 'illiquid'))::bigint as illiquid_base_cents from holdings`),
    await one('How much of the total rests on valuations older than policy?',
      `select count(*)::int as assets, coalesce(sum(value_base_cents), 0)::bigint as value_base_cents,
              round(100.0 * coalesce(sum(value_base_cents), 0) / nullif((select sum(value_base_cents) from holdings), 0), 1) as percent_of_total
       from stale_valuations`),
    await one('Which entity holds the most idle cash, as a share of what it owns?',
      `select entity, sum(value_base_cents) filter (where asset_class in ('cash', 'term-deposit'))::bigint as cash_base_cents,
              round(100.0 * coalesce(sum(value_base_cents) filter (where asset_class in ('cash', 'term-deposit')), 0) / nullif(sum(value_base_cents), 0), 1) as cash_percent
       from holdings group by entity order by cash_percent desc nulls last`),
    await one('How exposed is the family to each currency?',
      `select currency, sum(value_base_cents)::bigint as value_base_cents,
              round(100.0 * sum(value_base_cents) / nullif((select sum(value_base_cents) from holdings), 0), 1) as percent
       from holdings group by currency order by value_base_cents desc`),
    await one('How concentrated is it: the five largest assets as a share of everything?',
      `select asset, entity, value_base_cents, round(100.0 * value_base_cents / nullif((select sum(value_base_cents) from holdings), 0), 1) as percent
       from holdings order by value_base_cents desc nulls last limit 5`),
    await one('What did each provider charge in fees over the last 12 months?',
      `select coalesce(ac.provider, a.name, 'unassigned') as provider, t.currency, -sum(t.amount_cents)::bigint as fees_cents
       from transactions t left join assets a on a.id = t.asset_id left join accounts ac on ac.id = a.account_id
       where t.kind = 'fee' and t.occurred_on >= current_date - 365 group by 1, 2 order by fees_cents desc`),
    await one('What income did each entity receive over the last 12 months?',
      `select e.name as entity, t.currency, sum(t.amount_cents)::bigint as income_cents
       from transactions t join entities e on e.id = t.entity_id
       where t.kind in ('income', 'interest', 'distribution') and t.occurred_on >= current_date - 365
       group by e.name, t.currency order by income_cents desc`),
  ];
}

// ------------------------------------------------------------ import from Asora
// Asora exports holdings and transactions to Excel (Asora Format). Save each sheet as CSV.
// Headers are matched loosely; --map=FILE.json overrides any of them: {"entity": "Legal Entity", ...}.

const HOLDING_COLUMNS = {
  entity: ['entity', 'legal entity', 'owner', 'structure', 'entity name'],
  account: ['account', 'account name', 'portfolio', 'custodian account'],
  provider: ['custodian', 'bank', 'provider', 'institution'],
  asset: ['asset', 'asset name', 'name', 'security', 'holding', 'instrument', 'description'],
  class: ['asset class', 'class', 'asset type', 'type', 'category'],
  currency: ['currency', 'ccy', 'local currency'],
  value: ['market value', 'value', 'market value (local)', 'value (local)', 'local value', 'balance'],
  as_of: ['date', 'as of', 'as of date', 'valuation date', 'price date'],
};
const TXN_COLUMNS = {
  entity: HOLDING_COLUMNS.entity,
  asset: HOLDING_COLUMNS.asset,
  date: ['date', 'transaction date', 'trade date', 'value date', 'booking date'],
  type: ['type', 'transaction type', 'category', 'kind'],
  amount: ['amount', 'net amount', 'value', 'amount (local)', 'local amount'],
  currency: HOLDING_COLUMNS.currency,
  description: ['description', 'details', 'narrative', 'memo'],
  id: ['id', 'transaction id', 'reference', 'external id'],
};

export function mapClass(raw) {
  const s = String(raw || '').toLowerCase();
  if (/cash|current|savings|money market/.test(s)) return 'cash';
  if (/term deposit|deposit/.test(s)) return 'term-deposit';
  if (/venture/.test(s)) return 'venture';
  if (/private equity|pe fund|buyout|private credit|hedge|alternative|fund of funds/.test(s)) return 'private-equity';
  if (/real estate|property|land|farm/.test(s)) return 'property';
  if (/private (company|business|holding)|unlisted|direct investment/.test(s)) return 'private-company';
  if (/bond|fixed income|credit|debenture/.test(s)) return 'fixed-income';
  if (/equit|share|stock|etf|listed/.test(s)) return 'listed';
  if (/art|wine|collect|car|jewel/.test(s)) return 'collectible';
  if (/loan/.test(s)) return 'loan';
  return 'other';
}
const LIQUIDITY = { cash: 'daily', 'term-deposit': 'monthly', listed: 'daily', 'fixed-income': 'daily', 'private-equity': 'locked', venture: 'locked',
  property: 'illiquid', 'private-company': 'illiquid', collectible: 'illiquid', loan: 'illiquid', other: 'illiquid' };
export function mapTxnKind(raw) {
  const s = String(raw || '').toLowerCase();
  if (/dividend|income|rent|coupon/.test(s)) return 'income';
  if (/interest/.test(s)) return 'interest';
  if (/distribution|return of capital/.test(s)) return 'distribution';
  if (/fee|charge|commission/.test(s)) return 'fee';
  if (/tax|withholding|rwt|pie/.test(s)) return 'tax';
  if (/buy|purchase|subscription|capital call/.test(s)) return 'buy';
  if (/sell|sale|redemption/.test(s)) return 'sell';
  if (/deposit|contribution/.test(s)) return 'contribution';
  if (/withdraw/.test(s)) return 'withdrawal';
  if (/transfer/.test(s)) return 'transfer';
  return 'other';
}
function columnsFor(row, wanted, override) {
  const out = {};
  const headers = Object.keys(row);
  for (const [key, aliases] of Object.entries(wanted)) {
    const forced = override[key];
    if (forced) {
      if (!headers.includes(forced)) throw new Error(`--map says ${key} is "${forced}", but the file has no such column`);
      out[key] = forced;
      continue;
    }
    out[key] = headers.find((h) => aliases.includes(h.trim().toLowerCase())) || null;
  }
  return out;
}
const csvDate = (v) => {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // NZ and AU write day first
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  throw new Error(`Cannot read the date "${s}" (use YYYY-MM-DD or DD/MM/YYYY)`);
};
const csvMoney = (v) => {
  let s = String(v || '').trim();
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[()$,\s]/g, '').replace(/^[A-Z]{3}/i, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Cannot read the amount "${v}"`);
  return Math.round(Number(s) * 100) * (negative ? -1 : 1);
};

async function importAsora(db, args, o) {
  if (args[0] !== 'asora') throw new Error('Use: import asora --holdings=FILE.csv [--transactions=FILE.csv]');
  const override = o.map ? JSON.parse(fs.readFileSync(path.resolve(o.map), 'utf8')) : {};
  const counts = { entities: 0, accounts: 0, assets: 0, valuations: 0, transactions: 0, unchanged: 0 };
  const unmapped = new Set();

  async function entityFor(name) {
    const n = need(name, 'entity column');
    const found = await db.query('select * from entities where lower(name) = lower($1)', [n]);
    if (found.length) return found[0];
    counts.entities++;
    const kind = /trust/i.test(n) ? 'trust' : /\b(ltd|limited|pty|inc|llc)\b/i.test(n) ? 'company' : /partnership|\blp\b/i.test(n) ? 'partnership' : 'personal';
    const jurisdiction = /\bpty\b/i.test(n) ? 'AU' : 'NZ';
    return (await db.query('insert into entities (name, kind, jurisdiction, notes) values ($1, $2, $3, $4) returning *', [n, kind, jurisdiction, 'Created by the Asora import: check kind and jurisdiction']))[0];
  }
  async function assetFor(entity, name, row, cols) {
    const n = need(name, 'asset column');
    const found = await db.query('select * from assets where entity_id = $1 and lower(name) = lower($2)', [entity.id, n]);
    if (found.length) return found[0];
    let accountId = null;
    if (cols.account && row[cols.account]) {
      const provider = (cols.provider && row[cols.provider]) || 'Imported';
      const acc = await db.query('select id from accounts where entity_id = $1 and provider = $2 and name = $3', [entity.id, provider, row[cols.account]]);
      if (acc.length) accountId = acc[0].id;
      else { accountId = (await db.query('insert into accounts (entity_id, provider, name) values ($1, $2, $3) returning id', [entity.id, provider, row[cols.account]]))[0].id; counts.accounts++; }
    }
    const cls = mapClass(cols.class ? row[cols.class] : '');
    if (cls === 'other' && cols.class && row[cols.class]) unmapped.add(row[cols.class]);
    counts.assets++;
    return (await db.query('insert into assets (entity_id, account_id, name, asset_class, liquidity, currency) values ($1, $2, $3, $4, $5, $6) returning *',
      [entity.id, accountId, n, cls, LIQUIDITY[cls], ((cols.currency && row[cols.currency]) || 'NZD').toUpperCase()]))[0];
  }

  const digest = createHash('sha256');
  const files = [];
  if (!o.holdings && !o.transactions) throw new Error('Give --holdings=FILE.csv, --transactions=FILE.csv or both');

  if (o.holdings) {
    const raw = fs.readFileSync(path.resolve(o.holdings), 'utf8');
    digest.update(raw); files.push(path.basename(o.holdings));
    const rows = parseCsv(raw);
    if (!rows.length) throw new Error('The holdings file has no rows');
    const cols = columnsFor(rows[0], HOLDING_COLUMNS, override);
    for (const k of ['entity', 'asset', 'value']) if (!cols[k]) throw new Error(`The holdings file has no ${k} column (headers: ${Object.keys(rows[0]).join(', ')}). Pass --map={"${k}":"<header>"} in a file.`);
    for (const row of rows) {
      if (!String(row[cols.asset] || '').trim()) continue;
      const entity = await entityFor(row[cols.entity]);
      const asset = await assetFor(entity, row[cols.asset], row, cols);
      const asOf = cols.as_of && row[cols.as_of] ? csvDate(row[cols.as_of]) : o['as-of'] ? date(o['as-of'], 'as-of') : today();
      const value = csvMoney(row[cols.value]);
      const before = await db.query('select value_cents from valuations where asset_id = $1 and as_of = $2', [asset.id, asOf]);
      if (before.length && Number(before[0].value_cents) === value) { counts.unchanged++; continue; }
      await db.query(`insert into valuations (asset_id, as_of, value_cents, source, note) values ($1, $2, $3, 'import', 'Asora holdings export')
                      on conflict (asset_id, as_of) do update set value_cents = excluded.value_cents`, [asset.id, asOf, value]);
      counts.valuations++;
    }
  }

  if (o.transactions) {
    const raw = fs.readFileSync(path.resolve(o.transactions), 'utf8');
    digest.update(raw); files.push(path.basename(o.transactions));
    const rows = parseCsv(raw);
    if (rows.length) {
      const cols = columnsFor(rows[0], TXN_COLUMNS, override);
      for (const k of ['entity', 'date', 'amount']) if (!cols[k]) throw new Error(`The transactions file has no ${k} column (headers: ${Object.keys(rows[0]).join(', ')})`);
      for (const row of rows) {
        const entity = await entityFor(row[cols.entity]);
        const asset = cols.asset && row[cols.asset] ? await assetFor(entity, row[cols.asset], row, { ...cols, class: null }) : null;
        const on = csvDate(row[cols.date]);
        const amount = csvMoney(row[cols.amount]);
        const ref = 'asora:' + ((cols.id && row[cols.id]) || createHash('sha256').update(JSON.stringify(row)).digest('hex').slice(0, 24));
        const res = await db.query(`insert into transactions (entity_id, asset_id, occurred_on, kind, amount_cents, currency, description, external_ref)
                                    values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (external_ref) do nothing returning id`,
          [entity.id, asset?.id || null, on, mapTxnKind(cols.type ? row[cols.type] : ''), amount,
            ((cols.currency && row[cols.currency]) || asset?.currency || 'NZD').toUpperCase(), (cols.description && row[cols.description]) || '', ref]);
        if (res.length) counts.transactions++; else counts.unchanged++;
      }
    }
  }

  if (!o['dry-run']) {
    await db.query('insert into imports (source, file, digest, inserted, unchanged, actor) values ($1, $2, $3, $4, $5, $6)',
      ['asora', files.join(', '), digest.digest('hex'), counts.valuations + counts.transactions, counts.unchanged, o.actor || '']);
  }
  return { ...counts, dry_run: !!o['dry-run'], classes_not_recognised: [...unmapped] };
}

// ------------------------------------------------------------ output

export function parseArgs(argv) {
  const args = [];
  const options = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const i = a.indexOf('=');
      options[a.slice(2, i < 0 ? undefined : i)] = i < 0 ? true : a.slice(i + 1);
    } else args.push(a);
  }
  return { cmd: args.shift() || 'help', args, options };
}

const label = (k) => k.replace(/_base_cents$/, '').replace(/_cents$/, '').replace(/_bps$/, ' %').replace(/_/g, ' ');
function cell(v, key, row, baseCode) {
  if (v === null || v === undefined) return '';
  if (key.endsWith('_base_cents')) return money(v, baseCode);
  if (key.endsWith('_cents')) return money(v, row.currency || baseCode);
  if (key.endsWith('_bps')) return `${(Number(v) / 100).toFixed(2)}%`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function rowsTable(rows, baseCode) {
  if (!rows.length) return '  (none)';
  const keys = Object.keys(rows[0]).filter((k) => !/^(id|.*_id)$/.test(k) || k === 'id');
  return textTable(rows, keys.map((k) => ({ key: k, label: label(k), align: /_cents$|_bps$|^(percent|dpi|tvpi|assets|days_left|age_days)$/.test(k) ? 'right' : 'left', width: 48, format: (v, r) => cell(v, k, r, baseCode) })));
}
export function human(value, baseCode = 'NZD') {
  if (Array.isArray(value)) {
    if (value.length && value[0]?.question) return value.map((x, i) => `\n${i + 1}. ${x.question}\n${rowsTable(x.rows, baseCode)}`).join('\n');
    return rowsTable(value, baseCode);
  }
  if (value && typeof value === 'object') {
    const code = value.base_currency || baseCode;
    const flat = Object.entries(value).filter(([, v]) => !Array.isArray(v) && (v === null || typeof v !== 'object'));
    const lists = Object.entries(value).filter(([, v]) => Array.isArray(v));
    const objs = Object.entries(value).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    const out = [];
    if (flat.length) out.push(flat.map(([k, v]) => `  ${label(k).padEnd(28)} ${cell(v, k, value, code)}`).join('\n'));
    for (const [k, v] of objs) out.push(`\n${label(k)}\n` + Object.entries(v).filter(([kk]) => !/_id$|^id$|_at$/.test(kk)).map(([kk, vv]) => `  ${label(kk).padEnd(28)} ${cell(vv, kk, v, code)}`).join('\n'));
    for (const [k, v] of lists) out.push(`\n${label(k)}\n${rowsTable(v, code)}`);
    return out.join('\n');
  }
  return String(value);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  let db;
  try {
    const { cmd, args, options } = parseArgs(process.argv.slice(2));
    db = await getDb();
    const result = await run(db, cmd, args, options);
    console.log(options.json ? JSON.stringify(result, null, 2) : human(result, await base(db)));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
