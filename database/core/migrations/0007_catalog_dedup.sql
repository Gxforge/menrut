-- MenRut CORE 0007 — Deduplicación del catálogo geográfico consolidado.
-- Corrige el efecto de 0006 sobre bases donde coexistían el catálogo v2
-- (ids cuid, code limpio, sortOrder 1..16) y las filas absorbidas de v1
-- (ids slug, code 'v1-*', sortOrder 900): la absorción por INSERT OR IGNORE
-- comparaba ids distintos y duplicó cada provincia y municipio.
-- Verificado antes de aplicar: NINGUNA ruta, cobertura ni proyección
-- referencia los ids v1 (todas usan cuid v2), por lo que borrar las filas
-- v1-espejo es seguro. Un municipio/provincia v1 sin gemelo v2 (dato único)
-- NO se toca (cláusula EXISTS). Idempotente por naturaleza.
DELETE FROM Municipality
 WHERE provinceId IN (
   SELECT id FROM Province
    WHERE code LIKE 'v1-%'
      AND EXISTS (SELECT 1 FROM Province p2
                   WHERE p2.name = Province.name AND p2.code NOT LIKE 'v1-%'));
DELETE FROM Province
 WHERE code LIKE 'v1-%'
   AND EXISTS (SELECT 1 FROM Province p2
               WHERE p2.name = Province.name AND p2.code NOT LIKE 'v1-%');
