-- Demo data: the Hartley family, fictional. Dates are relative to today, so there is always a
-- stale valuation, an overdue capital call, a missing trust document and a Division 7A shortfall
-- for the attention and compliance commands to find. Safe to run twice.

insert into settings (key, value) values ('base_currency', 'NZD'), ('family_name', 'Hartley family') on conflict (key) do nothing;

insert into valuation_policy (asset_class, max_age_days) values
  ('cash', 35), ('term-deposit', 100), ('listed', 35), ('fixed-income', 35), ('private-equity', 120), ('venture', 120),
  ('property', 400), ('private-company', 400), ('collectible', 730), ('loan', 400), ('other', 365)
on conflict (asset_class) do nothing;

insert into div7a_rates (income_year, rate_bps, source) values
  (2023, 477, 'https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate'),
  (2024, 827, 'https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate'),
  (2025, 877, 'https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate'),
  (2026, 837, 'https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate'),
  (2027, 877, 'https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate')
on conflict (income_year) do nothing;

insert into required_documents (jurisdiction, entity_kind, kind, rule) values
  ('NZ', 'trust', 'trust-deed', 'Trusts Act 2019 (NZ) s45(a)'),
  ('NZ', 'trust', 'property-records', 'Trusts Act 2019 (NZ) s45(c)'),
  ('NZ', 'trust', 'trustee-decisions', 'Trusts Act 2019 (NZ) s45(d)'),
  ('NZ', 'trust', 'financial-statements', 'Trusts Act 2019 (NZ) s45(f)'),
  ('NZ', 'trust', 'trustee-appointments', 'Trusts Act 2019 (NZ) s45(g)'),
  ('NZ', 'trust', 'memorandum-of-wishes', 'Trusts Act 2019 (NZ) s45(h)')
on conflict do nothing;

insert into fx_rates (currency, as_of, rate, source) values
  ('AUD', current_date - 1, 1.120000, 'Demo rate: replace with your bank or custodian rate')
on conflict do nothing;

insert into members (id, name, relationship, born) values
  ('a1000000-0000-4000-8000-000000000000', 'Graham Hartley', 'Settlor and trustee', '1958-04-11'),
  ('a2000000-0000-4000-8000-000000000000', 'Susan Hartley', 'Trustee', '1960-09-02'),
  ('a3000000-0000-4000-8000-000000000000', 'Olivia Hartley', 'Daughter', '1989-01-23'),
  ('a4000000-0000-4000-8000-000000000000', 'James Hartley', 'Son', '1992-07-30')
on conflict do nothing;

insert into entities (id, name, kind, jurisdiction, registration, balance_date, trustees) values
  ('b1000000-0000-4000-8000-000000000000', 'Graham and Susan Hartley', 'personal', 'NZ', '', '31 March', ''),
  ('b2000000-0000-4000-8000-000000000000', 'Hartley Family Trust', 'trust', 'NZ', '', '31 March', 'Graham Hartley, Susan Hartley, Kauri Trustees Ltd'),
  ('b3000000-0000-4000-8000-000000000000', 'Hartley Holdings Ltd', 'company', 'NZ', 'NZBN 9429000000001', '31 March', ''),
  ('b4000000-0000-4000-8000-000000000000', 'Hartley Investments Pty Ltd', 'company', 'AU', 'ACN 000 000 001', '30 June', '')
on conflict do nothing;

insert into ownership (id, owner_member_id, owner_entity_id, owned_entity_id, percent, basis) values
  ('c1000000-0000-4000-8000-000000000000', 'a1000000-0000-4000-8000-000000000000', null, 'b1000000-0000-4000-8000-000000000000', 50, 'shares'),
  ('c2000000-0000-4000-8000-000000000000', 'a2000000-0000-4000-8000-000000000000', null, 'b1000000-0000-4000-8000-000000000000', 50, 'shares'),
  ('c3000000-0000-4000-8000-000000000000', 'a1000000-0000-4000-8000-000000000000', null, 'b4000000-0000-4000-8000-000000000000', 50, 'shares'),
  ('c4000000-0000-4000-8000-000000000000', 'a2000000-0000-4000-8000-000000000000', null, 'b4000000-0000-4000-8000-000000000000', 50, 'shares'),
  ('c5000000-0000-4000-8000-000000000000', null, 'b2000000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 100, 'shares')
on conflict do nothing;

insert into beneficiaries (id, entity_id, member_id, informed_on) values
  ('d1000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'a1000000-0000-4000-8000-000000000000', current_date - 800),
  ('d2000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'a2000000-0000-4000-8000-000000000000', current_date - 800),
  ('d3000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'a3000000-0000-4000-8000-000000000000', current_date - 400),
  ('d4000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'a4000000-0000-4000-8000-000000000000', null)
on conflict do nothing;

insert into accounts (id, entity_id, provider, name, kind, currency) values
  ('e1000000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 'ANZ', 'Business operating', 'bank', 'NZD'),
  ('e2000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'Jarden', 'Managed portfolio', 'custody', 'NZD'),
  ('e3000000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'Macquarie', 'Wrap account', 'platform', 'AUD'),
  ('e4000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'Kiwibank', 'Term deposits', 'bank', 'NZD'),
  ('e5000000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'Westpac', 'AUD cash', 'bank', 'AUD')
on conflict do nothing;

insert into assets (id, entity_id, account_id, name, asset_class, liquidity, currency) values
  ('f0100000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 'e1000000-0000-4000-8000-000000000000', 'ANZ operating cash', 'cash', 'daily', 'NZD'),
  ('f0200000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'e2000000-0000-4000-8000-000000000000', 'Jarden managed portfolio', 'listed', 'daily', 'NZD'),
  ('f0300000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'e3000000-0000-4000-8000-000000000000', 'Macquarie ASX portfolio', 'listed', 'daily', 'AUD'),
  ('f0400000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', null, '14 Ward Street, Hamilton', 'property', 'illiquid', 'NZD'),
  ('f0500000-0000-4000-8000-000000000000', 'b1000000-0000-4000-8000-000000000000', null, 'Family home, Remuera', 'property', 'illiquid', 'NZD'),
  ('f0600000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', null, 'Southern Cross Growth Fund III', 'private-equity', 'locked', 'NZD'),
  ('f0700000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', null, 'Tasman Ventures II', 'venture', 'locked', 'AUD'),
  ('f0800000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', null, 'Kowhai Orchards Ltd (18%)', 'private-company', 'illiquid', 'NZD'),
  ('f0900000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'e4000000-0000-4000-8000-000000000000', 'Kiwibank 12 month term deposit', 'term-deposit', 'monthly', 'NZD'),
  ('f1000000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', null, 'Art collection', 'collectible', 'illiquid', 'NZD'),
  ('f1100000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', null, 'Loan to Olivia Hartley', 'loan', 'illiquid', 'NZD'),
  ('f1200000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'e5000000-0000-4000-8000-000000000000', 'Westpac AUD cash', 'cash', 'daily', 'AUD'),
  ('f1300000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', null, 'Loan receivable: Graham Hartley', 'loan', 'illiquid', 'AUD')
on conflict do nothing;

insert into valuations (asset_id, as_of, value_cents, source, note) values
  ('f0100000-0000-4000-8000-000000000000', current_date - 2, 124000000, 'statement', ''),
  ('f0200000-0000-4000-8000-000000000000', current_date - 365, 790000000, 'statement', ''),
  ('f0200000-0000-4000-8000-000000000000', current_date - 3, 842000000, 'statement', ''),
  ('f0300000-0000-4000-8000-000000000000', current_date - 50, 310500000, 'statement', ''),
  ('f0400000-0000-4000-8000-000000000000', current_date - 470, 650000000, 'appraisal', 'Registered valuer, market value'),
  ('f0500000-0000-4000-8000-000000000000', current_date - 210, 410000000, 'estimate', 'Agent appraisal'),
  ('f0600000-0000-4000-8000-000000000000', current_date - 340, 128000000, 'manager', 'Quarterly NAV statement'),
  ('f0600000-0000-4000-8000-000000000000', current_date - 160, 141000000, 'manager', 'Quarterly NAV statement'),
  ('f0700000-0000-4000-8000-000000000000', current_date - 60, 18200000, 'manager', 'Half-year NAV'),
  ('f0800000-0000-4000-8000-000000000000', current_date - 300, 90000000, 'board', 'Last capital raise price'),
  ('f0900000-0000-4000-8000-000000000000', current_date - 20, 50000000, 'statement', ''),
  ('f1000000-0000-4000-8000-000000000000', current_date - 800, 35000000, 'appraisal', 'Insurance valuation'),
  ('f1100000-0000-4000-8000-000000000000', current_date - 90, 25000000, 'board', 'Interest-free, repayable on demand'),
  ('f1200000-0000-4000-8000-000000000000', current_date - 2, 21000000, 'statement', ''),
  ('f1300000-0000-4000-8000-000000000000', current_date - 30, 37000000, 'board', 'Per loan schedule')
on conflict do nothing;

insert into commitments (id, entity_id, asset_id, manager, committed_cents, currency, vintage, invest_period_ends) values
  ('10100000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'f0600000-0000-4000-8000-000000000000', 'Southern Cross Partners', 200000000, 'NZD', 2022, current_date + 500),
  ('10200000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'f0700000-0000-4000-8000-000000000000', 'Tasman Ventures', 50000000, 'AUD', 2024, current_date + 1100)
on conflict do nothing;

insert into capital_calls (id, commitment_id, notice_date, due_date, amount_cents, status, paid_on) values
  ('20100000-0000-4000-8000-000000000000', '10100000-0000-4000-8000-000000000000', current_date - 914, current_date - 900, 60000000, 'paid', current_date - 901),
  ('20200000-0000-4000-8000-000000000000', '10100000-0000-4000-8000-000000000000', current_date - 514, current_date - 500, 40000000, 'paid', current_date - 500),
  ('20300000-0000-4000-8000-000000000000', '10100000-0000-4000-8000-000000000000', current_date - 214, current_date - 200, 30000000, 'paid', current_date - 202),
  ('20400000-0000-4000-8000-000000000000', '10100000-0000-4000-8000-000000000000', current_date - 18, current_date - 4, 15000000, 'noticed', null),
  ('20500000-0000-4000-8000-000000000000', '10100000-0000-4000-8000-000000000000', null, current_date + 25, 20000000, 'expected', null),
  ('20600000-0000-4000-8000-000000000000', '10200000-0000-4000-8000-000000000000', current_date - 414, current_date - 400, 10000000, 'paid', current_date - 399),
  ('20700000-0000-4000-8000-000000000000', '10200000-0000-4000-8000-000000000000', current_date - 164, current_date - 150, 10000000, 'paid', current_date - 150),
  ('20800000-0000-4000-8000-000000000000', '10200000-0000-4000-8000-000000000000', null, current_date + 60, 5000000, 'expected', null)
on conflict do nothing;

insert into transactions (entity_id, asset_id, occurred_on, kind, amount_cents, currency, description, external_ref) values
  ('b2000000-0000-4000-8000-000000000000', 'f0600000-0000-4000-8000-000000000000', current_date - 120, 'distribution', 25000000, 'NZD', 'Partial exit distribution', 'seed-t01'),
  ('b2000000-0000-4000-8000-000000000000', 'f0200000-0000-4000-8000-000000000000', current_date - 40, 'income', 6200000, 'NZD', 'Dividends, quarter', 'seed-t02'),
  ('b2000000-0000-4000-8000-000000000000', 'f0200000-0000-4000-8000-000000000000', current_date - 130, 'income', 5800000, 'NZD', 'Dividends, quarter', 'seed-t03'),
  ('b2000000-0000-4000-8000-000000000000', 'f0200000-0000-4000-8000-000000000000', current_date - 35, 'fee', -2100000, 'NZD', 'Portfolio management fee', 'seed-t04'),
  ('b4000000-0000-4000-8000-000000000000', 'f0300000-0000-4000-8000-000000000000', current_date - 60, 'fee', -980000, 'AUD', 'Wrap platform and adviser fee', 'seed-t05'),
  ('b4000000-0000-4000-8000-000000000000', 'f0300000-0000-4000-8000-000000000000', current_date - 75, 'income', 4400000, 'AUD', 'Franked dividends', 'seed-t06'),
  ('b2000000-0000-4000-8000-000000000000', 'f0900000-0000-4000-8000-000000000000', current_date - 20, 'interest', 640000, 'NZD', 'Term deposit interest', 'seed-t07'),
  ('b3000000-0000-4000-8000-000000000000', 'f0400000-0000-4000-8000-000000000000', current_date - 10, 'income', 4100000, 'NZD', 'Rent, Ward Street', 'seed-t08'),
  ('b3000000-0000-4000-8000-000000000000', 'f0400000-0000-4000-8000-000000000000', current_date - 40, 'income', 4100000, 'NZD', 'Rent, Ward Street', 'seed-t09'),
  ('b3000000-0000-4000-8000-000000000000', 'f0400000-0000-4000-8000-000000000000', current_date - 70, 'income', 4100000, 'NZD', 'Rent, Ward Street', 'seed-t10'),
  ('b3000000-0000-4000-8000-000000000000', 'f0800000-0000-4000-8000-000000000000', current_date - 200, 'income', 3600000, 'NZD', 'Dividend, Kowhai Orchards', 'seed-t11')
on conflict do nothing;

-- A Division 7A loan made two income years ago, with one short repayment since.
insert into loans (id, name, kind, lender_entity_id, borrower_entity_id, borrower_member_id, principal_cents, currency, made_on, term_years, agreement_on, notes) values
  ('30100000-0000-4000-8000-000000000000', 'Pty Ltd loan to Graham', 'div7a', 'b4000000-0000-4000-8000-000000000000', null, 'a1000000-0000-4000-8000-000000000000',
    40000000, 'AUD', make_date(income_year_au(current_date) - 3, 9, 1), 7, make_date(income_year_au(current_date) - 3, 9, 1), 'Unsecured, 7 year term'),
  ('30200000-0000-4000-8000-000000000000', 'Trust loan to Olivia', 'related-party', 'b2000000-0000-4000-8000-000000000000', null, 'a3000000-0000-4000-8000-000000000000',
    25000000, 'NZD', current_date - 700, 25, current_date - 700, 'Interest-free, repayable on demand')
on conflict do nothing;

insert into loan_repayments (id, loan_id, paid_on, amount_cents, note) values
  ('31100000-0000-4000-8000-000000000000', '30100000-0000-4000-8000-000000000000', make_date(income_year_au(current_date) - 2, 12, 15), 3000000, 'Part repayment')
on conflict do nothing;

insert into deadlines (id, entity_id, title, due_date, rule, done_on) values
  ('40100000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 'Annual return to the Companies Office', current_date - 5, 'Companies Act 1993 (NZ) s214', null),
  ('40200000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'Trustee annual meeting and resolutions', current_date + 10, '', null),
  ('40300000-0000-4000-8000-000000000000', 'b4000000-0000-4000-8000-000000000000', 'ASIC annual statement review and fee', current_date + 40, 'ASIC annual review', null),
  ('40400000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'Trust tax return', current_date + 150, 'Inland Revenue filing date', null),
  ('40500000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'Trust financial statements signed', current_date - 120, '', current_date - 125)
on conflict do nothing;

insert into documents (id, entity_id, kind, title, dated, location) values
  ('50100000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'trust-deed', 'Deed of Trust', '2004-06-18', 'Lawyer safe custody, ref HFT-01'),
  ('50200000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'property-records', 'Asset register (this database)', current_date - 3, 'This database'),
  ('50300000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'financial-statements', 'Financial statements, last year', current_date - 125, 'Accountant portal'),
  ('50400000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'trustee-appointments', 'Deed of appointment, Kauri Trustees Ltd', '2015-03-02', 'Lawyer safe custody, ref HFT-04'),
  ('50500000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 'constitution', 'Company constitution', '2004-07-01', 'Lawyer safe custody')
on conflict do nothing;

insert into activity (id, entity_id, asset_id, note, actor, at) values
  ('60100000-0000-4000-8000-000000000000', 'b2000000-0000-4000-8000-000000000000', 'f0600000-0000-4000-8000-000000000000', 'Manager flagged a further call this quarter for a follow-on round.', 'Office manager', now() - interval '18 days'),
  ('60200000-0000-4000-8000-000000000000', 'b3000000-0000-4000-8000-000000000000', 'f0400000-0000-4000-8000-000000000000', 'Tenant asked about a five year renewal. Valuer to be booked before terms are agreed.', 'Office manager', now() - interval '30 days')
on conflict do nothing;
