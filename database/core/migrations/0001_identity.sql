PRAGMA foreign_keys=ON;
CREATE TABLE global_accounts (
 user_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','provisioning','active','suspended','deleted')),
 created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE TABLE user_roles (
 user_id TEXT NOT NULL REFERENCES global_accounts(user_id), role TEXT NOT NULL
 CHECK(role IN ('client','business','courier')), PRIMARY KEY(user_id,role)
);
CREATE TABLE shard_registry (
 shard_id INTEGER PRIMARY KEY CHECK(shard_id BETWEEN 1 AND 9),
 binding TEXT NOT NULL UNIQUE, enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 size_bytes INTEGER NOT NULL DEFAULT 0 CHECK(size_bytes>=0),
 capacity_bytes INTEGER NOT NULL DEFAULT 500000000 CHECK(capacity_bytes>0),
 measured_at INTEGER, schema_version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE allocation_state (id INTEGER PRIMARY KEY CHECK(id=1), last_shard INTEGER NOT NULL);
INSERT INTO allocation_state VALUES(1,0);
CREATE TABLE courier_shard_map (
 user_id TEXT PRIMARY KEY REFERENCES global_accounts(user_id),
 shard_id INTEGER NOT NULL REFERENCES shard_registry(shard_id),
 status TEXT NOT NULL DEFAULT 'provisioning', assigned_at INTEGER NOT NULL DEFAULT(unixepoch())
);
-- The insertion and pointer advance execute inside SQLite's single write transaction.
CREATE TRIGGER advance_pointer AFTER INSERT ON courier_shard_map BEGIN
 UPDATE allocation_state SET last_shard=NEW.shard_id WHERE id=1;
END;
CREATE TABLE trial_claims (
 identity_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES global_accounts(user_id),
 granted_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE TABLE admin_permissions (
 user_id TEXT NOT NULL REFERENCES global_accounts(user_id), permission TEXT NOT NULL,
 PRIMARY KEY(user_id,permission)
);
CREATE TABLE audit_logs (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
 entity_id TEXT NOT NULL, reason TEXT NOT NULL, request_id TEXT NOT NULL,
 created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE TABLE geographic_provinces(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE);
CREATE TABLE geographic_municipalities(
 id TEXT PRIMARY KEY,province_id TEXT NOT NULL REFERENCES geographic_provinces(id),name TEXT NOT NULL,
 UNIQUE(province_id,name)
);
CREATE TABLE rate_limit_buckets (
 bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL CHECK(hits>=0), reset_at INTEGER NOT NULL
);
