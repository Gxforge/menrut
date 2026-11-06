CREATE TABLE courier_profiles (
 user_id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT 'Mensajero',
 description TEXT NOT NULL DEFAULT '',province_id TEXT,municipality_id TEXT,photo_path TEXT,
 contact_phone TEXT,public_phone INTEGER NOT NULL DEFAULT 0 CHECK(public_phone IN(0,1)),
 available INTEGER NOT NULL DEFAULT 1 CHECK(available IN(0,1)),
 visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN(0,1)),version INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL DEFAULT(unixepoch())
);
-- Permanence is represented exactly as credit-seconds (1 credit = 8640 seconds).
CREATE TABLE credit_wallets (
 user_id TEXT PRIMARY KEY REFERENCES courier_profiles(user_id),
 permanence_seconds INTEGER NOT NULL DEFAULT 0 CHECK(permanence_seconds>=0),
 tool_credits INTEGER NOT NULL DEFAULT 0 CHECK(tool_credits>=0),
 settled_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,plan_id TEXT NOT NULL DEFAULT 'basic'
);
CREATE TABLE credit_ledger (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
 wallet TEXT NOT NULL CHECK(wallet IN('permanence','tools')),
 delta INTEGER NOT NULL,balance_after INTEGER NOT NULL CHECK(balance_after>=0),
 operation_id TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 UNIQUE(user_id,wallet,operation_id)
);
CREATE TABLE processed_events(id TEXT PRIMARY KEY,processed_at INTEGER NOT NULL DEFAULT(unixepoch()));
CREATE TABLE shard_outbox (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL,version INTEGER NOT NULL,
 processed_at INTEGER,attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,
 created_at INTEGER NOT NULL DEFAULT(unixepoch()),UNIQUE(user_id,version)
);
CREATE TABLE courier_services (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
 name TEXT NOT NULL,price_minor INTEGER NOT NULL CHECK(price_minor>=0)
);
CREATE INDEX services_owner ON courier_services(user_id);
CREATE TABLE courier_routes (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
 origin_id TEXT NOT NULL,destination_id TEXT NOT NULL
);
CREATE INDEX routes_owner ON courier_routes(user_id);
CREATE TABLE delivery_verifications (
 id TEXT PRIMARY KEY,courier_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
 client_id TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,confirmed_at INTEGER,UNIQUE(id,client_id)
);
CREATE TABLE reviews (
 id TEXT PRIMARY KEY,verification_id TEXT NOT NULL UNIQUE REFERENCES delivery_verifications(id),
 courier_id TEXT NOT NULL REFERENCES courier_profiles(user_id),author_id TEXT NOT NULL,
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'published',created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
