---
description: Filing, review and meeting dates for every entity, soonest first.
---

1. Run `npm run family -- deadlines --json` (add `--days=N` for a window). Show overdue first.
2. Add a date with `npm run family -- add-deadline ENTITY --title=TEXT --due=DATE --rule=SOURCE`. Put the law it comes from in `--rule` when there is one (Companies Act 1993 (NZ) s214 for an annual return): the compliance check reports overdue dates that carry a rule.
3. Mark one done with `npm run family -- done DEADLINE --on=DATE`.
4. When a yearly date is done, offer to add next year's.
