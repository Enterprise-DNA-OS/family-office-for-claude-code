---
description: Private fund commitments: committed, called, uncalled, distributed, DPI and TVPI.
---

Run `npm run family -- commitments --json`. Show the table, then one line each for: the largest uncalled amount, the lowest DPI, and any fund whose NAV is older than policy (cross-check `npm run family -- stale`). DPI is distributions over paid-in capital; TVPI adds the latest NAV. Say both are as at the NAV date shown.
