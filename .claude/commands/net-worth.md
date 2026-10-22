---
description: The family's total, by entity, asset class, liquidity or currency, in the base currency.
---

1. Run `npm run family -- net-worth --by=entity --json`. If the operator asked for a split ("by asset class", "by currency", "how much is illiquid"), use `--by=class`, `--by=currency` or `--by=liquidity`.
2. Show the total first in one line, then the table. Name the base currency.
3. If `npm run family -- stale --json` returns rows, say how much of the total rests on valuations older than policy, in one line.
4. Never round a figure the operator will quote. Never add a figure the database does not hold.
