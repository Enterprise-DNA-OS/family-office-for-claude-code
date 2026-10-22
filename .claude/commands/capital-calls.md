---
description: Capital calls not yet paid, soonest first, with the cash to meet each.
---

1. Run `npm run family -- calls --json` (add `--days=N` for a window).
2. Show overdue calls first, then by due date. For each, name the entity that pays and the cash it holds.
3. When the operator says a call is paid, run `npm run family -- pay-call ID --on=DATE`. When a notice arrives, run `npm run family -- add-call FUND --amount=AMOUNT --due=DATE --notice=DATE`.
4. To prepare the trustee approval, run `/draft-capital-call-approval`. Nothing here pays anything.
