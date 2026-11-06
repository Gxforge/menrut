CREATE TABLE public_courier_directory (
 user_id TEXT PRIMARY KEY REFERENCES global_accounts(user_id), slug TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 province_id TEXT, municipality_id TEXT, photo_path TEXT,
 available INTEGER NOT NULL DEFAULT 1 CHECK(available IN(0,1)),
 visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN(0,1)),
 expires_at INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL, rating_sum INTEGER NOT NULL DEFAULT 0,
 review_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX directory_location ON public_courier_directory(province_id,municipality_id,user_id)
 WHERE visible=1;
CREATE INDEX directory_visible ON public_courier_directory(user_id,expires_at) WHERE visible=1;
CREATE TABLE sync_inbox(event_id TEXT PRIMARY KEY,received_at INTEGER NOT NULL DEFAULT(unixepoch()));
CREATE TABLE sync_failures(event_id TEXT PRIMARY KEY,error_code TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE system_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT INTO system_settings VALUES('brand','MenRut'),('currency','CUP');
CREATE TABLE plans (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,level INTEGER NOT NULL UNIQUE,
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN(0,1)),
 permanence_credits INTEGER NOT NULL CHECK(permanence_credits>=0),
 tool_credits INTEGER NOT NULL CHECK(tool_credits>=0),price_minor INTEGER NOT NULL CHECK(price_minor>=0)
);
INSERT INTO plans VALUES('basic','Básico',1,0,300,100,150000),
 ('pro','Profesional',2,0,300,350,250000),('featured','Destacado',3,0,300,700,400000);
CREATE TABLE payment_requests (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES global_accounts(user_id),
 plan_id TEXT NOT NULL REFERENCES plans(id),status TEXT NOT NULL DEFAULT 'pending'
 CHECK(status IN('draft','pending','under_review','approved','rejected','cancelled','credited')),
 price_minor INTEGER NOT NULL,permanence_credits INTEGER NOT NULL,tool_credits INTEGER NOT NULL,
 proof_path TEXT,created_at INTEGER NOT NULL DEFAULT(unixepoch()),UNIQUE(user_id,id)
);
CREATE TABLE outbox_events (
 id TEXT PRIMARY KEY,event_type TEXT NOT NULL,user_id TEXT NOT NULL,payload TEXT NOT NULL,
 processed_at INTEGER,attempts INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
