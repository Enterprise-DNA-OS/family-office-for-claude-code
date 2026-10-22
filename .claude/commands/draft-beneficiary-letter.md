---
description: Basic trust information for a beneficiary (Trusts Act 2019 s51), as a draft for the trustees.
---

1. Run `npm run family -- beneficiaries TRUST --json`.
2. Run `npm run docs -- beneficiary-information` and give the operator the file for that beneficiary.
3. If they want a letter, write it to `drafts/beneficiary-information-NAME.md`: that they are a beneficiary, the trustees' names and how to contact them, and that they may ask for trust information. Plain words, no legal advice.
4. Say the trustees or their lawyer should read it before it is given. Once given, record it with `npm run family -- inform TRUST --member=NAME --on=DATE`.
