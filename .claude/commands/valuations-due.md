---
description: Assets whose last valuation is older than the house policy allows, largest first.
---

1. Run `npm run family -- stale --json`. Order by base value, largest first, because a stale valuation on a large asset moves the total most.
2. For each, say who usually provides the value: the custodian statement (listed, cash), the fund manager's NAV statement (private equity, venture), a registered valuer (property), the board or the last raise price (private company), an appraiser (collectibles).
3. When the operator gives a new value, run `/value`.
4. To ask a manager or valuer for one, run `/draft-valuation-request`. The policy itself lives in the valuation policy records; change it with `/customise`.
