---
description: Record a new valuation for an asset.
---

Run `npm run family -- value ASSET --value=AMOUNT --as-of=DATE --source=statement|manager|appraisal|board|estimate --note=TEXT`. Amounts are in the asset's own currency, in dollars. Read the value back from `npm run family -- valuations ASSET` and show the change from the previous one as an amount and a percentage. Never record a value the operator did not give you or that is not in a document they pointed you at.
