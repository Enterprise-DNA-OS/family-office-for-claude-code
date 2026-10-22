# Moving off Asora

Asora exports holdings and transactions to Excel. Its help centre covers both: [how to export holdings](https://service.asora.com/knowledge-base/how-to-export-holdings) and [how to export transactions](https://service.asora.com/knowledge-base/how-to-export-transactions). Choose **Asora Format** for each, then save the sheet from Excel as **CSV UTF-8**.

## 1. Export

- **Holdings:** one row per holding, for the date you want to start from. Pick the latest month end.
- **Transactions:** from the Connections tab or the Datahub tab. The Datahub lets you choose columns: keep entity, asset, date, type, amount, currency, description and the transaction id.

Export a second holdings file for an earlier month end if you want history; each import adds that date's values.

## 2. Import

```bash
npm run family -- import asora --holdings=holdings.csv --transactions=transactions.csv --dry-run
npm run family -- import asora --holdings=holdings.csv --transactions=transactions.csv
```

The dry run shows what would be created. The second line does it. Running the same files again changes nothing: values match on asset and date, transactions on their id (or a fingerprint of the row when there is no id).

Columns are matched by common names, ignoring case:

| What | Headers it looks for |
|---|---|
| Entity | Entity, Legal Entity, Owner, Structure |
| Account | Account, Account Name, Portfolio |
| Custodian | Custodian, Bank, Provider, Institution |
| Asset | Asset, Asset Name, Name, Security, Holding, Instrument |
| Asset class | Asset Class, Class, Asset Type, Type, Category |
| Value | Market Value, Value, Local Value, Balance |
| Date | Date, As Of, Valuation Date |
| Transaction type | Type, Transaction Type, Category |
| Amount | Amount, Net Amount |
| Transaction id | Transaction ID, ID, Reference |

If your file names a column differently, write a map file and pass it:

```json
{ "entity": "Legal Entity Name", "value": "Market Value (Local)" }
```

```bash
npm run family -- import asora --holdings=holdings.csv --map=map.json
```

Dates read as YYYY-MM-DD or day first (30/09/2026). Amounts may carry commas, a currency code or brackets for negatives.

## 3. What maps

| Asora | Here |
|---|---|
| Legal entity | An entity. Its kind is guessed from the name (Trust, Ltd, Pty) and its jurisdiction from Pty: check both with `/entity`. |
| Custodian and account | An account under that entity. |
| Holding | An asset, with its class mapped (listed, cash, term deposit, private equity, venture, property, private company, fixed income, collectible, loan, other) and a liquidity set from the class. |
| Market value on a date | A valuation with source "import". |
| Transaction | A transaction, its type mapped to income, interest, distribution, fee, tax, buy, sell, contribution, withdrawal or transfer. |

The import prints any asset class it did not recognise. Those land as "other": fix them with `/customise` or tell Claude Code the right class.

## 4. What does not carry over

- **Ownership between entities and people.** Add it with `/add` (`own ENTITY --owner=... --percent=... --basis=shares|units|discretionary`). This is what `/look-through` needs.
- **Fund commitments and capital calls.** An export carries the fund's value, not the promise. Add each commitment and its calls from the fund's notices.
- **Documents.** Asora stores files. This system records where each paper is kept. Keep the files where they are and record their location.
- **Bank and custodian feeds.** Values arrive by import or by telling Claude Code. Enterprise DNA connects the feeds a family needs in the custom version.
- **Performance history.** Bring earlier month-end holdings files if you want past values.

## 5. Check

```bash
npm run family -- net-worth
npm run family -- holdings
npm run family -- attention
```

Compare the total with Asora's for the same date before you stop paying for it.
