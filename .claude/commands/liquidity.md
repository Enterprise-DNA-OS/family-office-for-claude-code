---
description: Cash the family can reach against what the funds can ask for.
---

1. Run `npm run family -- liquidity --json` and `npm run family -- calls --days=90 --json`.
2. Lead with one sentence: cash on hand, calls due in 90 days, calls due in 12 months, and everything still uncalled.
3. Show which entity each call lands on, and whether that entity holds enough cash itself (`npm run family -- holdings --entity=NAME --class=cash --json`). A call that lands on an entity without the cash is the headline.
4. Never suggest moving money. Name the gap and let the operator decide.
