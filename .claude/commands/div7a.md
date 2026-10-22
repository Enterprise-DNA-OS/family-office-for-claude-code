---
description: Division 7A loans: the minimum yearly repayment each income year, what was repaid and the shortfall.
---

1. Run `npm run family -- div7a [LOAN] --json`.
2. Show the schedule. Lead with the current income year: the minimum, what has been repaid, what is left, and the 30 June date it must be paid by.
3. A shortfall in a finished year is the headline: say it may be treated as an unfranked dividend under s109E and that the accountant should look at it now.
4. Record a repayment with `npm run family -- repay LOAN --amount=AMOUNT --on=DATE`. If the ATO publishes a new benchmark rate, add it to the rates with `/customise` and cite the ATO page.
5. The figures are a working paper. Interest is charged on the opening balance for the full year; an accountant's daily-balance working can differ slightly. Never call this tax advice.
