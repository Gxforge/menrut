-- MenRut CORE 0003 — Planes con duraciones, ajustes de pago y rol de propietario.
-- Aprobación del propietario (2026-11-09): matriz de precios del borrador,
-- pago manual por Transfermóvil y jerarquía propietario/administrador/moderador.
-- payment_requests y plans están vacíos: se reconstruyen sin pérdida de datos.
-- defer_foreign_keys difiere la validación al COMMIT (reconstrucción atómica).
PRAGMA defer_foreign_keys=true;

CREATE TABLE plans_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  duration_days INTEGER NOT NULL CHECK(duration_days>0),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
  permanence_credits INTEGER NOT NULL CHECK(permanence_credits>=0),
  tool_credits INTEGER NOT NULL CHECK(tool_credits>=0),
  price_minor INTEGER NOT NULL CHECK(price_minor>=0)
);
INSERT INTO plans_v2 VALUES
  ('basic-1m','Básico',1,30,0,300,100,150000),
  ('basic-3m','Básico',1,90,0,900,100,420000),
  ('basic-6m','Básico',1,180,0,1800,100,750000),
  ('basic-12m','Básico',1,365,0,3650,100,1350000),
  ('pro-1m','Profesional',2,30,0,300,350,250000),
  ('pro-3m','Profesional',2,90,0,900,350,690000),
  ('pro-6m','Profesional',2,180,0,1800,350,1200000),
  ('pro-12m','Profesional',2,365,0,3650,350,2100000),
  ('featured-1m','Destacado',3,30,0,300,700,400000),
  ('featured-3m','Destacado',3,90,0,900,700,1080000),
  ('featured-6m','Destacado',3,180,0,1800,700,1920000),
  ('featured-12m','Destacado',3,365,0,3650,700,3480000);

DROP TABLE payment_requests;
DROP TABLE plans;
ALTER TABLE plans_v2 RENAME TO plans;

CREATE TABLE payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES global_accounts(user_id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('draft','pending','under_review','approved','rejected','cancelled','credited')),
  price_minor INTEGER NOT NULL,
  permanence_credits INTEGER NOT NULL,
  tool_credits INTEGER NOT NULL,
  proof_path TEXT,
  created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  confirmed_amount_minor INTEGER,
  decided_by TEXT,
  decided_at INTEGER,
  decision_note TEXT,
  UNIQUE(user_id,id)
);

-- Ajustes de pago reales confirmados por el propietario (Transfermóvil solamente).
INSERT OR REPLACE INTO system_settings(key,value) VALUES
  ('payment_method','Transfermóvil'),
  ('payment_card','9205-0699-9403-1473'),
  ('payment_phone','+5352678747'),
  ('payment_note','Transfiere el importe exacto por Transfermóvil a la tarjeta indicada y conserva la captura. El propietario confirma la recepción antes de activar el plan.');

-- Propietario único con autoridad total (cuenta nexolink.core1@gmail.com).
-- Su cuenta global debe existir antes de otorgar el permiso (FK).
INSERT OR IGNORE INTO global_accounts(user_id,status) VALUES
  ('0a9b6c90-614d-4f9b-8575-5dffcb8a99c8','active');
INSERT OR REPLACE INTO admin_permissions(user_id,permission) VALUES
  ('0a9b6c90-614d-4f9b-8575-5dffcb8a99c8','owner');

-- El directorio nacional proyecta el tipo de mensajero para búsquedas y fichas.
ALTER TABLE public_courier_directory ADD COLUMN coverage_type TEXT NOT NULL DEFAULT 'municipal';
CREATE INDEX directory_coverage ON public_courier_directory(coverage_type) WHERE visible=1;
