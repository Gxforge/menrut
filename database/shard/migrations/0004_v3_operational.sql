-- MenRut SHARD 0004 — Modelo operativo v3 del mensajero (contrato v2).
-- Añade a courier_profiles/courier_routes los campos del contrato de la app y
-- recrea `reviews` (tabla VACÍA en producción) para permitir opiniones de
-- usuarios registrados sin entrega verificada (decisión del propietario:
-- comentar/puntuar requiere solo registro como usuario normal; las opiniones
-- con entrega verificada quedan marcadas con is_verified=1).
-- Unidades: credit_wallets y credit_ledger en SEGUNDOS (1 crédito = 8640 s,
-- igual que v1). reviews.created_at y courier_routes.*_at en MILISEGUNDOS
-- (igual que el contrato v2 de la app).

DROP TABLE IF EXISTS reviews;
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  verification_id TEXT REFERENCES delivery_verifications(id),
  courier_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
  author_id TEXT NOT NULL,       -- identidad global (sub de Supabase)
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN(0,1)),
  response TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN('published','hidden')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_courier ON reviews(courier_id, status, created_at);

-- Perfil: campos profesionales del contrato v2.
ALTER TABLE courier_profiles ADD COLUMN availability_note TEXT NOT NULL DEFAULT '';
ALTER TABLE courier_profiles ADD COLUMN vehicle_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE courier_profiles ADD COLUMN base_fee_cup INTEGER;
ALTER TABLE courier_profiles ADD COLUMN years_experience INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courier_profiles ADD COLUMN contact_preference TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE courier_profiles ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK(verification_status IN('unverified','pending','verified','rejected'));
ALTER TABLE courier_profiles ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN(0,1));
ALTER TABLE courier_profiles ADD COLUMN rating_sum INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courier_profiles ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE courier_profiles ADD COLUMN verified_deliveries INTEGER NOT NULL DEFAULT 0;

-- Cobertura por municipios (mensajeros de zona / municipales).
CREATE TABLE IF NOT EXISTS courier_coverage (
  user_id TEXT NOT NULL REFERENCES courier_profiles(user_id) ON DELETE CASCADE,
  municipality_id TEXT NOT NULL,
  PRIMARY KEY(user_id, municipality_id)
);

-- Rutas: detalle completo del contrato v2 (v1 usaba solo origen/destino por
-- municipio, NOT NULL). Se recrea (tabla VACÍA en producción) para permitir
-- rutas provinciales sin municipio: origin_id/destination_id = municipios
-- (rutas municipales, NULL en provinciales); *_province_id = provincias.
DROP TABLE IF EXISTS courier_routes;
CREATE TABLE courier_routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
  origin_id TEXT,
  destination_id TEXT,
  origin_province_id TEXT,
  destination_province_id TEXT,
  scope TEXT NOT NULL DEFAULT 'municipal' CHECK(scope IN('municipal','provincial')),
  stops TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'personalizada',
  days_note TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'paquetes',
  vehicle_type TEXT NOT NULL DEFAULT 'motor',
  fee_cup INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','scheduled','paused','closed')),
  next_departure_at INTEGER,   -- ms (contrato v2)
  notes TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN(0,1)),
  created_at INTEGER NOT NULL,  -- ms
  updated_at INTEGER NOT NULL   -- ms
);
CREATE INDEX IF NOT EXISTS routes_owner ON courier_routes(user_id);

-- Denuncias sobre mensajeros: datos operativos, viven en el shard dueño.
CREATE TABLE IF NOT EXISTS report_flags (
  id TEXT PRIMARY KEY,
  courier_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
  reporter_id TEXT NOT NULL,     -- identidad global
  target_type TEXT NOT NULL DEFAULT 'profile' CHECK(target_type IN('profile','review','conversation')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','reviewed','dismissed')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_flags_status ON report_flags(status, created_at);
