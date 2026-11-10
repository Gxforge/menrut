-- MenRut SHARD 0005 — Herramientas con reserva→confirmación→liberación y
-- destacado temporal del perfil. delivery_verifications (0001) ya tiene la
-- forma correcta para el OTP de entregas (code_hash + attempts + TTL), así
-- que el flujo OTP reutiliza esa tabla sin cambios.
PRAGMA foreign_keys=ON;

-- ─── Reservas de herramientas (créditos enteros de la cartera «tools») ──────
-- reserve: descuenta y retiene · confirm: aplica el efecto y consume ·
-- release (manual o por vencimiento): devuelve el crédito al mensajero.
CREATE TABLE IF NOT EXISTS tool_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),
  tool_id TEXT NOT NULL,               -- id del catálogo Tool en CORE
  tool_code TEXT NOT NULL,
  credit_cost INTEGER NOT NULL CHECK(credit_cost>=0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN('reserved','confirmed','released','expired')),
  operation_id TEXT NOT NULL UNIQUE,   -- idempotencia del ledger
  created_at INTEGER NOT NULL DEFAULT(unixepoch()),
  expires_at INTEGER NOT NULL,         -- TTL de la reserva (s)
  confirmed_at INTEGER,
  released_at INTEGER,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tool_reservations_user ON tool_reservations(user_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_tool_reservations_expiry ON tool_reservations(status,expires_at);

-- ─── Destacado temporal (herramienta «destacar») ────────────────────────────
ALTER TABLE courier_profiles ADD COLUMN highlighted_until INTEGER NOT NULL DEFAULT 0;

-- ─── OTP de entregas: índice por cliente (listado del cliente) ──────────────
CREATE INDEX IF NOT EXISTS idx_deliveries_client ON delivery_verifications(client_id,expires_at);
