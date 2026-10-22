-- Family Office for Claude Code: the whole schema.
-- People, the entities they own or benefit from, what each entity holds, what it is worth,
-- what has been promised to funds, what is owed between entities, and the dates and papers
-- the law expects. Runs on Postgres and on embedded PGlite.
-- Money is integer cents in the row's own currency. *_base_cents columns are converted to the
-- base currency in settings at the latest recorded exchange rate.

create table settings (
  key text primary key,
  value text not null
);

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  relationship text not null default '',
  born date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- An entity is anything that owns things: a person's own name, a trust, a company, a partnership.
create table entities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('personal', 'trust', 'company', 'partnership', 'foundation')),
  jurisdiction text not null default 'NZ' check (jurisdiction in ('NZ', 'AU', 'OTHER')),
  registration text not null default '',
  balance_date text not null default '31 March',
  trustees text not null default '',
  status text not null default 'active' check (status in ('active', 'wound-up')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who owns what. basis 'shares' and 'units' are fixed percentages and flow through to people.
-- 'discretionary' records control only: a discretionary trust's assets belong to no one person.
create table ownership (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid references members(id),
  owner_entity_id uuid references entities(id),
  owned_entity_id uuid not null references entities(id),
  percent numeric(7,4) not null check (percent > 0 and percent <= 100),
  basis text not null default 'shares' check (basis in ('shares', 'units', 'discretionary')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_member_id is null) <> (owner_entity_id is null)),
  check (owner_entity_id is null or owner_entity_id <> owned_entity_id)
);

create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  member_id uuid not null references members(id),
  informed_on date,
  not_informed_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, member_id)
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  provider text not null,
  name text not null,
  kind text not null default 'custody' check (kind in ('bank', 'custody', 'platform', 'fund', 'direct')),
  currency text not null default 'NZD',
  external_ref text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, provider, name)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  account_id uuid references accounts(id),
  name text not null,
  asset_class text not null check (asset_class in ('cash', 'term-deposit', 'listed', 'fixed-income', 'private-equity', 'venture', 'property', 'private-company', 'collectible', 'loan', 'other')),
  liquidity text not null default 'daily' check (liquidity in ('daily', 'monthly', 'locked', 'illiquid')),
  currency text not null default 'NZD',
  status text not null default 'held' check (status in ('held', 'sold')),
  external_ref text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, name)
);

create table valuations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  as_of date not null,
  value_cents bigint not null,
  source text not null default 'statement' check (source in ('statement', 'manager', 'appraisal', 'board', 'estimate', 'import')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, as_of)
);

-- How old a valuation may get before it needs refreshing. House policy, change it with /customise.
create table valuation_policy (
  asset_class text primary key,
  max_age_days int not null check (max_age_days > 0)
);

-- 1 unit of currency = rate units of the base currency.
create table fx_rates (
  currency text not null,
  as_of date not null,
  rate numeric(14,6) not null check (rate > 0),
  source text not null default '',
  primary key (currency, as_of)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  asset_id uuid references assets(id),
  occurred_on date not null,
  kind text not null check (kind in ('buy', 'sell', 'income', 'interest', 'distribution', 'fee', 'tax', 'contribution', 'withdrawal', 'transfer', 'other')),
  amount_cents bigint not null,
  currency text not null default 'NZD',
  description text not null default '',
  external_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A promise to a private fund. Called capital lives in capital_calls; money back is
-- transactions of kind 'distribution' against the commitment's asset.
create table commitments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  asset_id uuid not null unique references assets(id),
  manager text not null default '',
  committed_cents bigint not null check (committed_cents > 0),
  currency text not null default 'NZD',
  vintage int,
  invest_period_ends date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table capital_calls (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments(id),
  notice_date date,
  due_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'expected' check (status in ('expected', 'noticed', 'paid')),
  paid_on date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'paid') = (paid_on is not null))
);

-- Loans between the family's entities and people. kind 'div7a' is an Australian private
-- company lending to a shareholder or associate (Income Tax Assessment Act 1936, Division 7A).
create table loans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'related-party' check (kind in ('div7a', 'related-party', 'bank')),
  lender_entity_id uuid not null references entities(id),
  borrower_entity_id uuid references entities(id),
  borrower_member_id uuid references members(id),
  principal_cents bigint not null check (principal_cents > 0),
  currency text not null default 'NZD',
  made_on date not null,
  term_years int not null default 7 check (term_years between 1 and 25),
  agreement_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((borrower_entity_id is null) <> (borrower_member_id is null))
);

create table loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id),
  paid_on date not null,
  amount_cents bigint not null check (amount_cents > 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- income_year is the year the Australian income year ends in: 2025-26 is 2026.
create table div7a_rates (
  income_year int primary key,
  rate_bps int not null check (rate_bps > 0),
  source text not null
);

create table deadlines (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  title text not null,
  due_date date not null,
  rule text not null default '',
  done_on date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id),
  kind text not null,
  title text not null,
  dated date,
  location text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Papers each kind of entity must hold. Seeded with the Trusts Act 2019 (NZ) s45 list.
create table required_documents (
  jurisdiction text not null,
  entity_kind text not null,
  kind text not null,
  rule text not null,
  primary key (jurisdiction, entity_kind, kind)
);

create table activity (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id),
  asset_id uuid references assets(id),
  note text not null,
  actor text not null default '',
  at timestamptz not null default now()
);

create table imports (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  file text not null,
  digest text not null,
  inserted int not null default 0,
  unchanged int not null default 0,
  actor text not null default '',
  at timestamptz not null default now()
);

-- updated_at on every write
create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['members', 'entities', 'ownership', 'beneficiaries', 'accounts', 'assets', 'valuations',
    'transactions', 'commitments', 'capital_calls', 'loans', 'loan_repayments', 'deadlines', 'documents']
  loop
    execute format('create trigger %I before update on %I for each row execute function touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

create function income_year_au(d date) returns int language sql immutable as $$
  select extract(year from d)::int + case when extract(month from d) >= 7 then 1 else 0 end
$$;

-- ------------------------------------------------------------------ views

create view base_currency as
  select coalesce((select value from settings where key = 'base_currency'), 'NZD') as code;

create view fx_latest as
  select distinct on (currency) currency, as_of, rate from fx_rates order by currency, as_of desc;

create view holdings as
  with lv as (
    select distinct on (asset_id) asset_id, as_of, value_cents, source
    from valuations order by asset_id, as_of desc
  )
  select a.id, a.name as asset, e.id as entity_id, e.name as entity, e.kind as entity_kind,
         a.asset_class, a.liquidity, a.currency, lv.value_cents, lv.as_of, lv.source,
         (current_date - lv.as_of) as age_days,
         round(lv.value_cents * case when a.currency = (select code from base_currency) then 1 else fx.rate end)::bigint as value_base_cents
  from assets a
  join entities e on e.id = a.entity_id
  left join lv on lv.asset_id = a.id
  left join fx_latest fx on fx.currency = a.currency
  where a.status = 'held';

create view stale_valuations as
  select h.id, h.asset, h.entity, h.asset_class, h.as_of, h.age_days, p.max_age_days, h.value_base_cents
  from holdings h
  join valuation_policy p on p.asset_class = h.asset_class
  where h.as_of is null or h.age_days > p.max_age_days;

-- Each person's share of each entity through fixed shares and units, any number of layers deep.
create view member_look_through as
  with recursive chain as (
    select o.owner_member_id as member_id, o.owned_entity_id as entity_id, (o.percent / 100.0)::numeric as share, 1 as depth
    from ownership o where o.owner_member_id is not null and o.basis <> 'discretionary'
    union all
    select c.member_id, o.owned_entity_id, (c.share * o.percent / 100.0)::numeric, c.depth + 1
    from chain c join ownership o on o.owner_entity_id = c.entity_id and o.basis <> 'discretionary'
    where c.depth < 10
  )
  select m.id as member_id, m.name as member, e.id as entity_id, e.name as entity, sum(c.share) as share
  from chain c join members m on m.id = c.member_id join entities e on e.id = c.entity_id
  group by m.id, m.name, e.id, e.name;

-- Entities held through a discretionary trust: the family's, not any one person's.
create view discretionary_entities as
  with recursive held as (
    select e.id as trust_id, e.id as entity_id, 1.0::numeric as share, 0 as depth from entities e where e.kind = 'trust'
    union all
    select h.trust_id, o.owned_entity_id, (h.share * o.percent / 100.0)::numeric, h.depth + 1
    from held h join ownership o on o.owner_entity_id = h.entity_id and o.basis <> 'discretionary'
    where h.depth < 10
  )
  select t.name as trust, e.id as entity_id, e.name as entity, sum(h.share) as share
  from held h join entities t on t.id = h.trust_id join entities e on e.id = h.entity_id
  group by t.name, e.id, e.name;

create view net_worth_by_entity as
  select entity, entity_kind, count(*) as assets, sum(value_base_cents)::bigint as value_base_cents,
         sum(value_base_cents) filter (where liquidity in ('locked', 'illiquid'))::bigint as illiquid_base_cents
  from holdings group by entity, entity_kind;

create view commitment_status as
  select c.id, a.name as fund, e.name as entity, c.manager, c.currency, c.vintage, c.committed_cents,
         coalesce(paid.total, 0)::bigint as called_cents,
         (c.committed_cents - coalesce(paid.total, 0))::bigint as uncalled_cents,
         coalesce(dist.total, 0)::bigint as distributed_cents,
         h.value_cents as nav_cents, h.as_of as nav_as_of,
         case when coalesce(paid.total, 0) > 0 then round(coalesce(dist.total, 0)::numeric / paid.total, 2) end as dpi,
         case when coalesce(paid.total, 0) > 0 then round((coalesce(dist.total, 0) + coalesce(h.value_cents, 0))::numeric / paid.total, 2) end as tvpi
  from commitments c
  join assets a on a.id = c.asset_id
  join entities e on e.id = c.entity_id
  left join holdings h on h.id = c.asset_id
  left join (select commitment_id, sum(amount_cents) as total from capital_calls where status = 'paid' group by commitment_id) paid on paid.commitment_id = c.id
  left join (select asset_id, sum(amount_cents) as total from transactions where kind = 'distribution' group by asset_id) dist on dist.asset_id = c.asset_id;

create view open_calls as
  select k.id, a.name as fund, e.name as entity, c.currency, k.amount_cents, k.notice_date, k.due_date, k.status,
         (k.due_date - current_date) as days_left,
         round(k.amount_cents * case when c.currency = (select code from base_currency) then 1 else fx.rate end)::bigint as amount_base_cents
  from capital_calls k
  join commitments c on c.id = k.commitment_id
  join assets a on a.id = c.asset_id
  join entities e on e.id = c.entity_id
  left join fx_latest fx on fx.currency = c.currency
  where k.status <> 'paid';

-- Cash that can be reached this week against what the funds can ask for.
create view liquidity as
  select
    (select coalesce(sum(value_base_cents), 0) from holdings where asset_class in ('cash', 'term-deposit'))::bigint as cash_base_cents,
    (select coalesce(sum(value_base_cents), 0) from holdings where liquidity = 'daily' and asset_class not in ('cash', 'term-deposit'))::bigint as daily_liquid_base_cents,
    (select coalesce(sum(amount_base_cents), 0) from open_calls where due_date <= current_date + 90)::bigint as calls_90_days_base_cents,
    (select coalesce(sum(amount_base_cents), 0) from open_calls where due_date <= current_date + 365)::bigint as calls_12_months_base_cents,
    (select coalesce(sum(round(s.uncalled_cents * case when s.currency = (select code from base_currency) then 1 else fx.rate end)), 0)
       from commitment_status s left join fx_latest fx on fx.currency = s.currency)::bigint as uncalled_base_cents;

-- Division 7A year by year: opening balance, the benchmark rate, the minimum yearly repayment
-- (s109E formula), what was repaid, and the shortfall. Interest is charged on the opening balance
-- for the full year; an accountant's daily-balance working will differ slightly.
create view div7a_schedule as
  with recursive rep as (
    select loan_id, income_year_au(paid_on) as income_year, sum(amount_cents) as amount
    from loan_repayments group by loan_id, income_year_au(paid_on)
  ),
  sched as (
    select l.id as loan_id, income_year_au(l.made_on) as income_year, income_year_au(l.made_on) as loan_year, l.term_years,
           null::bigint as opening_cents, null::int as rate_bps, null::bigint as myr_cents,
           coalesce(r.amount, 0)::bigint as repaid_cents,
           greatest(0, l.principal_cents - coalesce(r.amount, 0))::bigint as closing_cents
    from loans l left join rep r on r.loan_id = l.id and r.income_year = income_year_au(l.made_on)
    where l.kind = 'div7a'
    union all
    select s.loan_id, s.income_year + 1, s.loan_year, s.term_years, s.closing_cents, d.rate_bps,
           case when d.rate_bps is null then null
                else round(s.closing_cents * (d.rate_bps / 10000.0)
                     / (1 - power(1 + d.rate_bps / 10000.0, -(s.term_years - (s.income_year - s.loan_year))::numeric)))::bigint end,
           coalesce(r.amount, 0)::bigint,
           greatest(0, round(s.closing_cents * (1 + coalesce(d.rate_bps, 0) / 10000.0)) - coalesce(r.amount, 0))::bigint
    from sched s
    left join div7a_rates d on d.income_year = s.income_year + 1
    left join rep r on r.loan_id = s.loan_id and r.income_year = s.income_year + 1
    where s.income_year + 1 <= income_year_au(current_date)
      and s.closing_cents > 0
      and s.income_year - s.loan_year < s.term_years
  )
  select l.name as loan, l.currency, s.income_year, (s.income_year - 1)::text || '-' || right(s.income_year::text, 2) as year_label,
         make_date(s.income_year, 6, 30) as year_ends, s.opening_cents, s.rate_bps, s.myr_cents, s.repaid_cents, s.closing_cents,
         case when s.myr_cents is null then null else greatest(0, s.myr_cents - s.repaid_cents) end as shortfall_cents,
         s.loan_year, s.loan_id
  from sched s join loans l on l.id = s.loan_id;

-- The rules the law sets, each citing its source (docs/compliance.md has the detail).
create view compliance_findings as
  select 'TRUSTS-S45' as rule, e.name as record, 'No ' || r.kind || ' on file' as issue, 'breached' as severity, r.rule as source
  from entities e
  join required_documents r on r.jurisdiction = e.jurisdiction and r.entity_kind = e.kind
  where e.status = 'active' and not exists (select 1 from documents d where d.entity_id = e.id and d.kind = r.kind)
  union all
  select 'TRUSTS-S51', e.name || ': ' || m.name, 'No record that basic trust information was given, and no reason recorded for not giving it', 'breached',
         'Trusts Act 2019 (NZ) s51 and s53'
  from beneficiaries b join entities e on e.id = b.entity_id join members m on m.id = b.member_id
  where e.jurisdiction = 'NZ' and e.kind = 'trust' and b.informed_on is null and b.not_informed_reason = ''
  union all
  select 'DIV7A-MYR', s.loan || ' ' || s.year_label, 'Repaid ' || s.currency || ' ' || to_char(round(s.repaid_cents / 100.0), 'FM999,999,999,990') || ' of a minimum ' || s.currency || ' ' || to_char(round(s.myr_cents / 100.0), 'FM999,999,999,990'), 'breached',
         'Income Tax Assessment Act 1936 (Cth) s109E'
  from div7a_schedule s where s.income_year < income_year_au(current_date) and s.shortfall_cents > 0
  union all
  select 'DIV7A-MYR', s.loan || ' ' || s.year_label, s.currency || ' ' || to_char(round(s.shortfall_cents / 100.0), 'FM999,999,999,990') || ' still to repay by ' || s.year_ends, case when s.year_ends - current_date <= 60 then 'due soon' else 'due' end,
         'Income Tax Assessment Act 1936 (Cth) s109E'
  from div7a_schedule s where s.income_year = income_year_au(current_date) and s.shortfall_cents > 0
  union all
  select 'DIV7A-RATE', s.loan || ' ' || s.year_label, 'No benchmark rate recorded for this income year', 'check', 'ATO Division 7A benchmark interest rate'
  from div7a_schedule s where s.income_year > s.loan_year and s.rate_bps is null
  union all
  select 'DIV7A-S109N', l.name, 'No written loan agreement recorded', 'breached', 'Income Tax Assessment Act 1936 (Cth) s109N'
  from loans l where l.kind = 'div7a' and l.agreement_on is null
  union all
  select 'DEADLINE', e.name || ': ' || d.title, (current_date - d.due_date) || ' days overdue', 'breached', d.rule
  from deadlines d join entities e on e.id = d.entity_id
  where d.done_on is null and d.due_date < current_date and d.rule <> '';

-- Everything that needs a person this week: the law, the house policy, money going out.
create view attention as
  select severity as level, rule as what, record, issue, source from compliance_findings
  union all
  select 'stale', 'VALUATION', entity || ': ' || asset,
         case when as_of is null then 'Never valued' else 'Last valued ' || as_of || ', ' || age_days || ' days ago (policy ' || max_age_days || ')' end,
         'House valuation policy'
  from stale_valuations
  union all
  select case when days_left < 0 then 'overdue' else 'due soon' end, 'CAPITAL CALL', entity || ': ' || fund,
         currency || ' ' || to_char(round(amount_cents / 100.0), 'FM999,999,999,990') || case when days_left < 0 then ' was due ' else ' due ' end || due_date,
         'Fund agreement'
  from open_calls where days_left <= 30
  union all
  select 'due soon', 'DEADLINE', e.name || ': ' || d.title, 'Due ' || d.due_date || ' (' || (d.due_date - current_date) || ' days)', d.rule
  from deadlines d join entities e on e.id = d.entity_id
  where d.done_on is null and d.due_date between current_date and current_date + 45
  union all
  select 'check', 'FX', currency, 'Assets in ' || currency || ' with no exchange rate recorded', 'House reporting'
  from (select distinct currency from holdings where value_base_cents is null and value_cents is not null) x;

-- The week, for /weekly-review and npm run view.
create view this_week as
  select 'Capital calls due in 30 days' as item, count(*)::text as value from open_calls where days_left between 0 and 30
  union all select 'Capital calls overdue', count(*)::text from open_calls where days_left < 0
  union all select 'Valuations past policy', count(*)::text from stale_valuations
  union all select 'Deadlines in 45 days', count(*)::text from deadlines where done_on is null and due_date between current_date and current_date + 45
  union all select 'Compliance findings', count(*)::text from compliance_findings;

-- Nothing here is for the public internet.
do $$
declare t text;
begin
  foreach t in array array['settings', 'members', 'entities', 'ownership', 'beneficiaries', 'accounts', 'assets', 'valuations',
    'valuation_policy', 'fx_rates', 'transactions', 'commitments', 'capital_calls', 'loans', 'loan_repayments', 'div7a_rates',
    'deadlines', 'documents', 'required_documents', 'activity', 'imports']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;
