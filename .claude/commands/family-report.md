---
description: The quarterly family wealth report, and a statement for each entity, in your brand.
---

1. Run `npm run family -- stale` first. If anything large is stale, say so before the report goes anywhere: the report will carry those values.
2. Run `npm run docs -- family-wealth-report` and `npm run docs -- entity-statement`.
3. Give the operator the file paths under `docs-out/`. They print to PDF from the browser.
4. Business name, logo and colours come from `brand.json`. The family name comes from the `family_name` setting. Nothing is sent.
