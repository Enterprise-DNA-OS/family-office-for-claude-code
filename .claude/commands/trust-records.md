---
description: Trusts Act 2019 (NZ) s45 core documents, trust by trust: what is on file and what is missing.
---

1. Run `npm run family -- trust-records --json`. Show missing documents first, with the subsection each comes from.
2. Record a document with `npm run family -- add-document TRUST --kind=KIND --title=TEXT --dated=DATE --location=WHERE`. Kinds: trust-deed, property-records, trustee-decisions, financial-statements, trustee-appointments, memorandum-of-wishes.
3. If there is no memorandum of wishes, record one titled "None made" so the record shows the trustees checked.
4. Where a document is kept, not the document itself, is what this holds. Never upload or paste a deed's contents into the database.
