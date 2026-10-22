---
description: Check the records against the rules this family lives under (Trusts Act 2019 s45 and s51, Division 7A, filing dates) and report what is breached or due, with the rule cited.
---

1. Run `npm run family -- compliance --json`. Each row has the rule, the record, the issue, a severity and the source.
2. Read `docs/compliance.md` for what each rule means and where its check lives.
3. Report as a table: rule, count, the worst example, the source. Breached first, then due soon, then due, then check.
4. For anything breached, name the fix the operator can approve: the document to record (`/trust-records`), the beneficiary record (`/beneficiaries`), the repayment (`/div7a`), the filing to mark done (`/entity-calendar`). Draft any letter to `drafts/`, never send.
5. If a rule in `docs/compliance.md` looks out of date (a new ATO benchmark rate, a changed section), say so and stop. Do not guess at law. The operator confirms the rule, then you update the doc and the check together with `/customise`.

Nothing here is legal or tax advice. It checks the records against the rules the operator has told the system to enforce, with their sources.
