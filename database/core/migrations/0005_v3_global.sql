-- MenRut CORE 0005 — Identidad global operativa v3 (arquitectura sharded).
-- La API v2 pasa de las tablas legacy (User/CourierProfile/... en CORE) a:
--   · Identidad: global_accounts + user_roles + account_profiles (clave = sub de Supabase).
--   · Datos de cliente/negocio (globales por naturaleza) en tablas propias de CORE.
--   · Datos operativos del mensajero en SU SHARD (ver shard 0004).
--   · Búsqueda nacional exclusivamente sobre la proyección pública ampliada.
-- 100% aditivo: no toca tablas legacy ni v1.
PRAGMA foreign_keys=ON;

-- ─── Perfil de visualización de toda cuenta global ─────────────────────────
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id TEXT PRIMARY KEY REFERENCES global_accounts(user_id),
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT 'Mi cuenta MENRUT',
  phone TEXT,
  avatar_path TEXT,              -- URL pública del avatar (referencia, nunca binario)
  updated_at INTEGER NOT NULL DEFAULT(unixepoch())
);

-- ─── Favoritos (cliente → mensajero, por identidad global) ─────────────────
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES global_accounts(user_id),
  courier_id TEXT NOT NULL,      -- user_id global del mensajero
  created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  PRIMARY KEY(user_id, courier_id)
);

-- ─── Rutas guardadas por clientes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES global_accounts(user_id),
  origin_municipality_id TEXT NOT NULL,
  destination_municipality_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  alerts_enabled INTEGER NOT NULL DEFAULT 1 CHECK(alerts_enabled IN(0,1)),
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);

-- ─── Conversaciones y mensajes (identidades globales) ──────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  courier_id TEXT NOT NULL,
  last_message_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  UNIQUE(client_id, courier_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- ─── Notificaciones globales por cuenta ────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'sistema',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

-- ─── Verificación de identidad de mensajeros (decisión administrativa) ─────
CREATE TABLE IF NOT EXISTS courier_verifications (
  id TEXT PRIMARY KEY,
  courier_id TEXT NOT NULL,      -- user_id global del mensajero
  document_url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),
  reviewed_by TEXT,
  review_note TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);

-- ─── Solicitudes de pago Transfermóvil (con acreditación idempotente) ──────
-- Reemplaza a la legacy PaymentProof: courier_id es identidad global y el
-- estado 'credited' marca la acreditación ya aplicada al shard (idempotencia).
CREATE TABLE IF NOT EXISTS payment_proofs (
  id TEXT PRIMARY KEY,
  courier_id TEXT NOT NULL,      -- user_id global del mensajero
  submitted_by TEXT NOT NULL,
  plan_id TEXT REFERENCES MembershipPlan(id),
  amount_cup INTEGER NOT NULL,
  confirmed_amount_cup INTEGER,
  method TEXT NOT NULL DEFAULT 'transfermovil',
  reference TEXT NOT NULL DEFAULT '',
  proof_url TEXT NOT NULL DEFAULT '',  -- ruta permanente en bucket privado
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected','credited')),
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status, created_at);

-- ─── Proyección pública ampliada (búsqueda nacional sin fanout) ────────────
-- Columnas que la búsqueda v2 necesita de cada mensajero público. Las llena
-- el sincronizador outbox → proyección (ver src/v2/shard.ts).
-- (coverage_type ya la añadió la migración 0003.)
ALTER TABLE public_courier_directory ADD COLUMN vehicle_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE public_courier_directory ADD COLUMN availability_note TEXT NOT NULL DEFAULT '';
ALTER TABLE public_courier_directory ADD COLUMN base_fee_cup INTEGER;
ALTER TABLE public_courier_directory ADD COLUMN years_experience INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public_courier_directory ADD COLUMN contact_preference TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE public_courier_directory ADD COLUMN verified_deliveries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public_courier_directory ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public_courier_directory ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public_courier_directory ADD COLUMN services_csv TEXT NOT NULL DEFAULT '';
ALTER TABLE public_courier_directory ADD COLUMN coverage_csv TEXT NOT NULL DEFAULT '';
ALTER TABLE public_courier_directory ADD COLUMN routes_json TEXT NOT NULL DEFAULT '[]';

-- ─── Auditoría global (identidades globales, sin FK a tablas legacy) ───────
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,                 -- identidad global (sub de Supabase); NULL = sistema
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT(unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
