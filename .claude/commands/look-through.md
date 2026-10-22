---
description: What each person owns outright through fixed shares, against what sits in discretionary trusts.
---

1. Run `npm run family -- look-through [MEMBER] --json` (leave MEMBER out for everyone).
2. Present three parts: each person's outright total, the entities behind it with their percentages, and the entities held through each discretionary trust with its beneficiaries.
3. Say plainly that discretionary trust assets belong to no single beneficiary. Do not split them between people, even if asked: say the trustees decide, and offer the trust's total instead.
4. If an ownership chain looks wrong (an entity owned more or less than 100%), run `npm run family -- structure` and point at the row.
