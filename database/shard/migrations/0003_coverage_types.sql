-- MenRut SHARD 0003 — Tipos de mensajero: zona, municipal y provincial.
-- Un mensajero de zona trabaja dentro de su municipio base (p. ej. Santa Clara)
-- y no define rutas interterritoriales. Municipal viaja entre municipios;
-- provincial entre provincias (scope en courier_routes desambigua el nivel).

ALTER TABLE courier_profiles ADD COLUMN coverage_type TEXT NOT NULL DEFAULT 'municipal'
  CHECK(coverage_type IN ('zone','municipal','provincial'));

ALTER TABLE courier_routes ADD COLUMN scope TEXT NOT NULL DEFAULT 'municipal'
  CHECK(scope IN ('municipal','provincial'));
