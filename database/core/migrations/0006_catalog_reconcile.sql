-- MenRut CORE 0006 — Catálogo geográfico oficial consolidado + reconciliación
-- programada + destacado en la proyección pública.
-- 1) Province/Municipality pasa a ser EL catálogo único; geographic_* se
--    convierte en vistas de compatibilidad (solo lectura) para la API v1.
--    Antes se absorbe cualquier fila que solo exista en el catálogo v1
--    (pérdida cero; las semillas son idénticas, esto es una red de seguridad).
-- 2) reconciliation_runs: bitácora de la reconciliación general programada
--    (auto-disparo por tráfico cada 6 h + cron externo), visible en /admin/system.
-- 3) highlighted_until: proyección del destacado temporal (herramienta).
PRAGMA foreign_keys=ON;

-- ─── 1) Catálogo geográfico consolidado ─────────────────────────────────────
INSERT OR IGNORE INTO Province(id,code,name,sortOrder)
  SELECT id,'v1-'||id,name,900 FROM geographic_provinces;
INSERT OR IGNORE INTO Municipality(id,provinceId,name)
  SELECT m.id,m.province_id,m.name FROM geographic_municipalities m
  WHERE EXISTS(SELECT 1 FROM Province p WHERE p.id=m.province_id);

DROP TABLE IF EXISTS geographic_municipalities;
DROP TABLE IF EXISTS geographic_provinces;
CREATE VIEW IF NOT EXISTS geographic_provinces AS SELECT id,name FROM Province;
CREATE VIEW IF NOT EXISTS geographic_municipalities AS SELECT id,provinceId AS province_id,name FROM Municipality;

-- ─── 2) Reconciliación programada ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id TEXT PRIMARY KEY,                  -- 'auto:<ventana-6h>' o 'cron:<id>'
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  pending_before INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  reservations_released INTEGER NOT NULL DEFAULT 0,
  orphans_repaired INTEGER NOT NULL DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_started ON reconciliation_runs(started_at);

-- ─── 3) Destacado temporal en la proyección pública ─────────────────────────
ALTER TABLE public_courier_directory ADD COLUMN highlighted_until INTEGER NOT NULL DEFAULT 0;
