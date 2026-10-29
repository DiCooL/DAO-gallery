CREATE TABLE "users" (
	"id"	INTEGER,
	"wallet"	TEXT NOT NULL,
	"email"	TEXT,
	"created"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE artworks (
	id INTEGER PRIMARY KEY,
	title TEXT,
	artist TEXT,
	owner_user_id INTEGER,
	created TEXT,
	FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE NFTs (
	id INTEGER PRIMARY KEY,
	token_id TEXT UNIQUE,
	artwork_id INTEGER NOT NULL,
	owner_user_id INTEGER,
	minted TEXT,
	status TEXT,
	FOREIGN KEY (artwork_id) REFERENCES artworks(id),
	FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    nft_id INTEGER NOT NULL,
    seller_user_id INTEGER NOT NULL,
    buyer_user_id INTEGER NOT NULL,
    price REAL NOT NULL,
    commission_pct REAL NOT NULL,
    commission_amount REAL NOT NULL,
    tx_date TEXT NOT NULL,
    FOREIGN KEY (nft_id) REFERENCES nfts(id),
    FOREIGN KEY (seller_user_id) REFERENCES users(id),
    FOREIGN KEY (buyer_user_id) REFERENCES users(id)
);
