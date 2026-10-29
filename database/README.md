# Database

`DAO-gallery.db` is a prototype (SQLite file) with test data: 9 users, 7 artworks, 7 NFTs, 10 transactions. `schema.sql` is its current schema, exported from the file.

The target production database is PostgreSQL. The blockchain stays the source of truth for ownership; the database only mirrors confirmed on-chain events for analytics.

Known issues to fix in the PostgreSQL schema:
- amounts are stored as `REAL`; wei values need `NUMERIC(78,0)` or text;
- `token_id` is `TEXT`;
- `transactions.nft_id` references `nfts`, while the table is named `NFTs`;
- no authors table yet (planned author registry);
- `artworks` has no storage location or insurance fields.
