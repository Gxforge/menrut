#!/usr/bin/env python3
"""Aplica las migraciones v3 fase 2 a PRODUCCIÓN (10 bases D1) de forma
IDEMPOTENTE (segura de re-ejecutar):

  CORE 0006: catálogo geográfico consolidado (vistas geographic_* sobre el
             catálogo oficial Province/Municipality), reconciliation_runs y
             highlighted_until en la proyección pública.
  SHARD 0005 (×9): tool_reservations (reserva→confirmación→liberación),
             highlighted_until en courier_profiles e índice del OTP.

No usa el registro d1_migrations (los shards 03-09 se migraron por SQL crudo
en su día); detecta el estado real de cada base y solo ejecuta lo que falta.
Requiere: export CLOUDFLARE_API_TOKEN=... (permisos D1:edit de la cuenta
665fb2e43961e57d2f22283c6dec7d5c)."""
import json
import os
import sys
import urllib.request

ACC = "665fb2e43961e57d2f22283c6dec7d5c"
CORE = "3383e764-c3a3-40d9-aa71-38f07cfb205a"
SHARDS = {
    1: "abd5f4a5-36ae-499b-bad0-96a41250bb0f",
    2: "4fc1bf6d-86a2-4b9e-b15f-70c4c45c85f6",
    3: "c4ce188c-1ac0-40e7-ae91-ae69f8c6437d",
    4: "c5b9aa7c-2ed6-476e-bdfa-5c7306e2a807",
    5: "b13a697f-4980-4f12-bfb4-b374c22942a6",
    6: "bb49fb8e-70f3-4e23-9767-0e41d4df8dad",
    7: "a4e6b404-87f3-4bdf-b014-232f99d12016",
    8: "ce550417-56e4-476b-9bb3-2c6ab3d9cff4",
    9: "c14b9577-5767-4e68-a5b0-365c82a4e1c6",
}
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database"
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not TOKEN:
    sys.exit("Falta CLOUDFLARE_API_TOKEN en el entorno.")


def api(url, body=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if not data.get("success"):
        raise RuntimeError(json.dumps(data.get("errors"))[:400])
    return data["result"]


def query(db, sql, params=None):
    return api(f"{BASE}/{db}/query", {"sql": sql, "params": params or []})


def scalar(db, sql):
    rows = query(db, sql)
    return rows[0]["results"][0] if rows and rows[0]["results"] else None


def type_of(db, name):
    row = scalar(db, f"SELECT type FROM sqlite_master WHERE name='{name}'")
    return row["type"] if row else None


def column_exists(db, table, column):
    rows = query(db, f"PRAGMA table_info({table})")
    return any(c["name"] == column for c in rows[0]["results"])


def apply_core_dedup():
    """0007: elimina provincias/municipios v1-espejo duplicados (sin gemelo v2 no se toca)."""
    dup = scalar(CORE, "SELECT count(*) AS n FROM Province WHERE code LIKE 'v1-%' AND EXISTS(SELECT 1 FROM Province p2 WHERE p2.name=Province.name AND p2.code NOT LIKE 'v1-%')")
    if dup and dup["n"] > 0:
        n_m = scalar(CORE, "SELECT count(*) AS n FROM Municipality WHERE provinceId IN (SELECT id FROM Province WHERE code LIKE 'v1-%' AND EXISTS(SELECT 1 FROM Province p2 WHERE p2.name=Province.name AND p2.code NOT LIKE 'v1-%'))")["n"]
        query(CORE, "DELETE FROM Municipality WHERE provinceId IN (SELECT id FROM Province WHERE code LIKE 'v1-%' AND EXISTS(SELECT 1 FROM Province p2 WHERE p2.name=Province.name AND p2.code NOT LIKE 'v1-%'))")
        query(CORE, "DELETE FROM Province WHERE code LIKE 'v1-%' AND EXISTS(SELECT 1 FROM Province p2 WHERE p2.name=Province.name AND p2.code NOT LIKE 'v1-%')")
        print(f"  0007 dedup: {dup['n']} provincias y {n_m} municipios v1-espejo eliminados")
    else:
        print("  0007 dedup: sin duplicados")


def apply_core():
    print("── menrut-core 0006 ──")
    geo = type_of(CORE, "geographic_provinces")
    if geo == "table":
        before_p = scalar(CORE, "SELECT count(*) AS n FROM Province")["n"]
        before_m = scalar(CORE, "SELECT count(*) AS n FROM Municipality")["n"]
        print(f"  catálogos: Province={before_p} Municipality={before_m}")
        query(CORE, "INSERT OR IGNORE INTO Province(id,code,name,sortOrder) SELECT id,'v1-'||id,name,900 FROM geographic_provinces")
        query(CORE, "INSERT OR IGNORE INTO Municipality(id,provinceId,name) SELECT m.id,m.province_id,m.name FROM geographic_municipalities m WHERE EXISTS(SELECT 1 FROM Province p WHERE p.id=m.province_id)")
        query(CORE, "DROP TABLE IF EXISTS geographic_municipalities")
        query(CORE, "DROP TABLE IF EXISTS geographic_provinces")
        print("  tablas v1 absorbidas y sustituidas")
    elif geo == "view":
        print("  ya consolidado (vistas presentes)")
    else:
        print("  AVISO: geographic_provinces no existe; se crean las vistas sobre el catálogo oficial")
    query(CORE, "CREATE VIEW IF NOT EXISTS geographic_provinces AS SELECT id,name FROM Province")
    query(CORE, "CREATE VIEW IF NOT EXISTS geographic_municipalities AS SELECT id,provinceId AS province_id,name FROM Municipality")
    query(CORE, "CREATE TABLE IF NOT EXISTS reconciliation_runs (id TEXT PRIMARY KEY,started_at INTEGER NOT NULL,finished_at INTEGER,pending_before INTEGER NOT NULL DEFAULT 0,synced INTEGER NOT NULL DEFAULT 0,reservations_released INTEGER NOT NULL DEFAULT 0,orphans_repaired INTEGER NOT NULL DEFAULT 0,ok INTEGER NOT NULL DEFAULT 0,detail TEXT NOT NULL DEFAULT '')")
    query(CORE, "CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_started ON reconciliation_runs(started_at)")
    if not column_exists(CORE, "public_courier_directory", "highlighted_until"):
        query(CORE, "ALTER TABLE public_courier_directory ADD COLUMN highlighted_until INTEGER NOT NULL DEFAULT 0")
        print("  proyección: añadida highlighted_until")
    else:
        print("  proyección: highlighted_until ya presente")
    print("  verificación:", type_of(CORE, "geographic_provinces"), scalar(CORE, "SELECT count(*) AS n FROM Municipality")["n"], "municipios")


SHARD_DDL = [
    "CREATE TABLE IF NOT EXISTS tool_reservations (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES courier_profiles(user_id),tool_id TEXT NOT NULL,tool_code TEXT NOT NULL,credit_cost INTEGER NOT NULL CHECK(credit_cost>=0),status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN('reserved','confirmed','released','expired')),operation_id TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL DEFAULT(unixepoch()),expires_at INTEGER NOT NULL,confirmed_at INTEGER,released_at INTEGER,note TEXT NOT NULL DEFAULT '')",
    "CREATE INDEX IF NOT EXISTS idx_tool_reservations_user ON tool_reservations(user_id,status,created_at)",
    "CREATE INDEX IF NOT EXISTS idx_tool_reservations_expiry ON tool_reservations(status,expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_deliveries_client ON delivery_verifications(client_id,expires_at)",
]


def apply_shard(sid, uuid):
    label = f"menrut-shard-{sid:02d}"
    print(f"── {label} 0005 ──")
    for ddl in SHARD_DDL:
        query(uuid, ddl)
    if not column_exists(uuid, "courier_profiles", "highlighted_until"):
        query(uuid, "ALTER TABLE courier_profiles ADD COLUMN highlighted_until INTEGER NOT NULL DEFAULT 0")
        print("  courier_profiles: añadida highlighted_until")
    else:
        print("  ya aplicado")
    n = scalar(uuid, "SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='tool_reservations'")["n"]
    assert n == 1, f"{label}: tool_reservations no existe tras aplicar"
    print("  verificación: tool_reservations OK")


if __name__ == "__main__":
    apply_core()
    apply_core_dedup()
    for sid, uuid in sorted(SHARDS.items()):
        apply_shard(sid, uuid)
    print("\nLISTO: 10 bases en modelo v3 fase 2 (catálogo único, reservas, OTP y reconciliación).")
