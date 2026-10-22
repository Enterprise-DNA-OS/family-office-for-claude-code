---
description: Add a family member, entity, ownership link, account, asset, commitment, loan or transaction.
---

Pick the matching write and run it. Ask for anything required that the operator did not say.

| To add | Command |
|---|---|
| A person | `npm run family -- add-member --name=NAME --relationship=TEXT --born=DATE` |
| A trust or company | `npm run family -- add-entity --name=NAME --kind=trust|company|personal|partnership|foundation --jurisdiction=NZ|AU` |
| Who owns it | `npm run family -- own ENTITY --owner=PERSON_OR_ENTITY --percent=N --basis=shares|units|discretionary` |
| A beneficiary | `npm run family -- add-beneficiary TRUST --member=NAME` |
| An account | `npm run family -- add-account ENTITY --provider=NAME --name=NAME --currency=NZD` |
| An asset | `npm run family -- add-asset ENTITY --name=NAME --class=CLASS --value=AMOUNT --as-of=DATE` |
| A fund commitment | `npm run family -- add-commitment ENTITY --fund=NAME --amount=AMOUNT --manager=NAME --vintage=YEAR` |
| A loan | `npm run family -- add-loan --name=NAME --lender=ENTITY --borrower=NAME --amount=AMOUNT --made=DATE --kind=div7a|related-party` |
| A transaction | `npm run family -- add-txn ENTITY --kind=income|fee|distribution|... --amount=AMOUNT --asset=ASSET` |
| An exchange rate | `npm run family -- set-rate --currency=AUD --rate=N --as-of=DATE --source=TEXT` |

Run with `--dry-run` first when adding several records at once. Read the record back and show it.
