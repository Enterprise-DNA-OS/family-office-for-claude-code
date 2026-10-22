# Compliance: the rules this system checks

`npm run family -- compliance` (and `/compliance`) checks the records against the rules below. Each rule has its source, what a breach looks like in the data, and where the check lives. This is a record of the rules the operator has told the system to enforce. It is not legal or tax advice: the trustees, directors and their advisers decide.

Every check is a row in the `compliance_findings` view in `supabase/migrations/0001_family_office.sql`. To change one, use `/customise`: it writes a new migration, never an edit to an applied one.

## Trusts Act 2019 (New Zealand)

| Rule | Source | Breach in the data | Check |
|---|---|---|---|
| TRUSTS-S45 | Trusts Act 2019 s45: a trustee must keep, so far as reasonably possible, the core documents: the trust deed and variations, records of trust property (assets, liabilities, income and expenses), records of trustee decisions, written contracts, accounting records and financial statements, documents of appointment, removal and discharge of trustees, and any memorandum of wishes. | An active NZ trust has no document of a required kind on file. | `required_documents` lists the kinds; `trust-records` shows each one. |
| TRUSTS-S51 | Trusts Act 2019 s51: a trustee must make basic trust information known to each beneficiary (that they are a beneficiary, the trustees' names and contact details, and their right to request trust information). s53 lists the factors a trustee considers in deciding not to. | A beneficiary of an NZ trust has no date informed and no recorded reason for not informing them. | `beneficiaries` table, `informed_on` and `not_informed_reason`. |

Sections 46 to 48 say every trustee keeps the deed and variations, the documents are kept for the whole trusteeship, and they pass to replacement trustees. The document register here records where each paper is kept, not the paper itself.

If a trust has no memorandum of wishes, record a document of kind `memorandum-of-wishes` titled "None made", so the check knows the trustees looked.

Official text: https://www.legislation.govt.nz/act/public/2019/0038/latest/

## Division 7A (Australia)

| Rule | Source | Breach in the data | Check |
|---|---|---|---|
| DIV7A-MYR | Income Tax Assessment Act 1936 (Cth) s109E: a complying loan from a private company needs a minimum yearly repayment each income year after the year it was made. Shortfalls can be treated as an unfranked dividend. | A finished income year where repayments were less than the minimum (breached), or the current year's minimum not yet repaid (due, due soon inside 60 days of 30 June). | `div7a_schedule` view. |
| DIV7A-S109N | Income Tax Assessment Act 1936 (Cth) s109N: the loan needs a written agreement, a benchmark rate or higher, and a maximum term of 7 years, or 25 years when secured by a registered mortgage. | A `div7a` loan with no agreement date. The CLI refuses terms other than 7 or 25 years. | `loans.agreement_on`. |
| DIV7A-RATE | ATO, Division 7A benchmark interest rate: https://www.ato.gov.au/tax-rates-and-codes/division-7a-benchmark-interest-rate | An income year in a loan's schedule with no benchmark rate recorded. | `div7a_rates`. |

The minimum yearly repayment is the s109E formula: the balance at the end of the previous income year, times the benchmark rate, divided by one minus (1 + rate) to the power of minus the remaining term. The schedule charges interest on the opening balance for the full year; an accountant's daily-balance working can differ slightly. Treat it as a working paper.

Benchmark rates recorded in the seed (income year: rate): 2022-23: 4.77%, 2023-24: 8.27%, 2024-25: 8.77%, 2025-26: 8.37%, 2026-27: 8.77%. Each July, add the new year's rate from the ATO page with `/customise`.

## Filing dates

| Rule | Source | Breach in the data | Check |
|---|---|---|---|
| DEADLINE | The rule written on the deadline, for example Companies Act 1993 (NZ) s214 (annual return each year in the company's filing month). | A deadline with a rule, past its due date, not marked done. | `deadlines` table. Deadlines without a rule are house dates: they show in `/attention`, not in compliance. |

## House policy (not law)

These show in `/attention`, never in `/compliance`:

- **Valuation policy.** How old a value may be, by asset class (`valuation_policy`). Defaults: cash and listed 35 days, term deposits 100, private equity and venture 120, property and private companies 400, collectibles 730.
- **Capital calls.** A call within 30 days, or past due, from the fund agreement.
- **Exchange rates.** An asset in a currency with no rate recorded.
