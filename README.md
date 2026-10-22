<h1 align="center">Family Office for Claude Code</h1>

<p align="center">
  <strong>The open-source family office that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Asora data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=asora">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/asora?utm_source=github&utm_medium=readme&utm_campaign=asora">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-asora">Instead of Asora</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Family Office for Claude Code does the job you pay Asora for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Asora dashboard cannot.

Asora prices by the wealth you track. Its [pricing page](https://asora.com/pricing) shows US$15,600 a year (US$1,300 a month, billed annually) for a family tracking $50 to 100 million, a one-time onboarding fee of 25% of the annual subscription (US$3,900 at that tier), and US$3,600 a year for each extra pack of 20 investment accounts. The bill climbs with the family's net worth, not with anything the office does.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=asora).

It holds the family's whole position in one database: the people, the trusts, companies and personal holdings they own or benefit from, what each one holds and what it was last worth, private fund commitments and capital calls, loans between the entities, filing dates and where every trust paper is kept. It is for single family offices and for the accounting and advisory firms in New Zealand and Australia that run the office for a family.

It checks the legal side next to the money: Trusts Act 2019 (NZ) s45 core documents and s51 beneficiary information, Division 7A minimum yearly repayments for Australian private company loans, and every filing date with a rule behind it.

### Ten questions Asora's dashboard does not answer

Every one is a command that runs today (`/insights` runs all ten):

1. What does each person own outright, against what sits in discretionary trusts?
2. How much can the funds still call, and how much of that is due in the next 12 months?
3. Which fund commitments have paid back the least of what they called?
4. What share of the family's wealth cannot be sold within a month?
5. How much of the total rests on valuations older than policy?
6. Which entity holds the most idle cash, as a share of what it owns?
7. How exposed is the family to each currency?
8. How concentrated is it: the five largest assets as a share of everything?
9. What did each provider charge in fees over the last 12 months?
10. What income did each entity receive over the last 12 months?

### Three real runs on the demo family

The demo is the Hartley family (fictional): a New Zealand family trust, a company under it, an Australian company owned by the parents, and their own names.

**"What needs my attention this week?"** (`/attention`, trimmed)

```
  level     what          record                                       issue                                       source
  breached  DEADLINE      Hartley Holdings Ltd: Annual return to th... 5 days overdue                              Companies Act 1993 (NZ) s214
  breached  DIV7A-MYR     Pty Ltd loan to Graham 2025-26               Repaid AUD 30,000 of a minimum AUD 77,804   Income Tax Assessment Act 1936 (Cth) s109E
  breached  TRUSTS-S45    Hartley Family Trust                         No memorandum-of-wishes on file             Trusts Act 2019 (NZ) s45(h)
  breached  TRUSTS-S45    Hartley Family Trust                         No trustee-decisions on file                Trusts Act 2019 (NZ) s45(d)
  breached  TRUSTS-S51    Hartley Family Trust: James Hartley          No record that basic trust information...   Trusts Act 2019 (NZ) s51 and s53
  overdue   CAPITAL CALL  Hartley Family Trust: Southern Cross Grow... NZD 150,000 was due 2026-10-18               Fund agreement
  stale     VALUATION     Hartley Holdings Ltd: 14 Ward Street, Ham... Last valued 2025-07-09, 470 days ago         House valuation policy
```

**"Can we meet the capital calls?"** (`/liquidity`)

```
  base currency                NZD
  cash                         $1,975,200
  daily liquid                 $11,897,600
  calls 90 days                $406,000
  calls 12 months              $406,000
  uncalled                     $1,036,000
  cash cover 12 months         4.87
```

**"Where does the Division 7A loan stand?"** (`/div7a`)

```
  loan                    income year  currency   opening  rate %      myr   repaid  shortfall   closing
  Pty Ltd loan to Graham  2024-25      AUD                                       $0             $400,000
  Pty Ltd loan to Graham  2025-26      AUD       $400,000   8.37%  $77,804  $30,000    $47,804  $403,480
  Pty Ltd loan to Graham  2026-27      AUD       $403,480   8.77%  $89,328       $0    $89,328  $438,865
```

Dates in the demo move with today, so there is always something to find.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/family-office-for-claude-code.git
cd family-office-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type a slash command. Start with `/attention`, then `/net-worth` and `/capital-calls`.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything that needs a person this week: legal checks, money going out, stale values, dates |
| `/net-worth` | The total by entity, asset class, liquidity or currency, in the base currency |
| `/look-through` | What each person owns outright, against what sits in discretionary trusts |
| `/holdings` | Every asset at its latest value |
| `/entity` | One trust, company or personal holding: owners, holdings, dates, papers |
| `/liquidity` | Cash the family can reach against what the funds can call |
| `/commitments` | Private fund commitments: committed, called, uncalled, distributed, DPI, TVPI |
| `/capital-calls` | Calls not yet paid, with the cash to meet each |
| `/valuations-due` | Assets valued longer ago than policy allows, largest first |
| `/value` | Record a new valuation |
| `/entity-calendar` | Annual returns, tax returns, trustee meetings and reviews |
| `/trust-records` | Trusts Act 2019 s45 core documents: on file or missing |
| `/beneficiaries` | Who benefits, and whether basic trust information was given (s51) |
| `/div7a` | Division 7A minimum yearly repayments and shortfalls, year by year |
| `/compliance` | Every legal check, with the rule it comes from |
| `/insights` | The ten questions above |
| `/weekly-review` | A one-page Monday review, written to `drafts/` |
| `/family-report` | The quarterly family wealth report and entity statements, in your brand |
| `/draft-capital-call-approval` | A trustee or director approval to pay a call, ready to sign |
| `/draft-beneficiary-letter` | Basic trust information for a beneficiary, for the trustees to review |
| `/draft-valuation-request` | A request to a manager or valuer for an up-to-date value |
| `/log` | A note against an entity or asset |
| `/history` | Everything recorded against an entity or asset |
| `/add` | Add a person, entity, ownership link, account, asset, commitment, loan or transaction |
| `/import` | Bring holdings and transactions across from Asora |
| `/export` | Every record as one JSON file |
| `/customise` | Add a field, change a rule or a policy, in plain language |
| `/new-view` | Add a read-only page to `npm run view` |
| `/help` | The list |

`npm run docs` renders the paperwork (family wealth report, entity statements, Division 7A loan schedule, capital call approval, beneficiary information) as branded HTML from `brand.json`. `npm run view` renders read-only pages: the week, net worth, commitments, stale values.

## Your first hour: ten things to ask for

1. "Set the base currency to AUD and the family name to the Ngata whānau." (`/customise`)
2. "Import these two Asora files." (`/import`)
3. "The trust owns 100% of the company, and Mere and Hone own the Pty Ltd 50/50." (`/add`)
4. "Add our commitment to the fund: $2 million, 2023 vintage, and the three calls paid so far." (`/add`, `/capital-calls`)
5. "What needs my attention?" (`/attention`)
6. "Which trust papers are missing?" (`/trust-records`)
7. "Can we meet the calls in the next 90 days, and from which entity?" (`/liquidity`)
8. "Property is revalued every two years, not every 400 days." (`/customise`)
9. "Draft the trustees' approval for the call due on the 16th." (`/draft-capital-call-approval`)
10. "Write the quarterly report with our logo." (`/family-report`)

## Instead of Asora

Export holdings and transactions from Asora in Asora Format, save each as CSV, and run `/import` (or `npm run family -- import asora --holdings=FILE.csv --transactions=FILE.csv --dry-run`, then again without `--dry-run`). Entities, accounts, assets, values and transactions come across; ownership, fund commitments and document locations you add once. The full guide, with the column mapping and what does not carry over: [docs/replace-asora.md](docs/replace-asora.md).

## Architecture

```
family-office-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Family Office for Claude Code for your business, migrates your Asora data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=asora)
- Read more: [enterprisedna.co/omni/instead-of/asora](https://enterprisedna.co/omni/instead-of/asora?utm_source=github&utm_medium=readme&utm_campaign=asora)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
