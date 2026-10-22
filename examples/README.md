# Example files

`asora-holdings.csv` and `asora-transactions.csv` show the shape the importer reads: an Asora holdings export and a transactions export, each saved from Excel as CSV. The test suite imports both. Your own export may name its columns differently: the importer matches the common names, and `--map=FILE.json` covers the rest. See `docs/replace-asora.md`.
