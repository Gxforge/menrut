-- MENRUT · Lanzamiento: cupos por municipio y descuento temporal.
-- Por municipio hay 10 cupos gratuitos, por orden de reclamación:
--   cupo 1      → 1 mes gratis (free_1m)
--   cupos 2–4   → 2 meses gratis cada uno (free_2m = dos acreditaciones de 1 mes)
--   cupos 5–10  → 1 mes gratis (free_1m)
-- El descuento del 20 % en todos los planes NO usa cupos: lo calcula el backend
-- hasta la fecha de fin (src/v2/launch-promo.ts).
-- Idempotente: CREATE IF NOT EXISTS e INSERT OR IGNORE.

CREATE TABLE IF NOT EXISTS courier_base_municipality (
  user_id         TEXT PRIMARY KEY,
  province_id     TEXT NOT NULL,
  municipality_id TEXT NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS launch_promo_slots (
  municipality_id TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('free_1m', 'free_2m')),
  claimed_by      TEXT,
  claimed_at      INTEGER,
  PRIMARY KEY (municipality_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_launch_promo_slots_free
  ON launch_promo_slots (municipality_id, claimed_by);

CREATE TABLE IF NOT EXISTS launch_promo_claims (
  user_id         TEXT PRIMARY KEY,
  municipality_id TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  kind            TEXT NOT NULL,
  claimed_at      INTEGER NOT NULL,
  granted_at      INTEGER
);

-- Cupos 1..10 generados con CTE recursivo (D1 limita los términos de UNION ALL).
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 10
)
INSERT OR IGNORE INTO launch_promo_slots (municipality_id, seq, kind)
SELECT m.id, s.n,
       CASE WHEN s.n BETWEEN 2 AND 4 THEN 'free_2m' ELSE 'free_1m' END
FROM Municipality m
CROSS JOIN seq s;
