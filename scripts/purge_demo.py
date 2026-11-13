#!/usr/bin/env python3
"""MENRUT — Retiro de datos demo de PRODUCCIÓN (puesta en producción real).

Tres fases:
  1) INVENTARIO (por defecto): cuenta filas demo en CORE + 9 shards.
  2) BACKUP: vuelca todas las filas demo a backups/demo-backup-<ts>.json.
  3) BORRADO (--apply): elimina las filas demo (hijos primero). Idempotente.

«demo» = cualquier referencia user_id/courier_id/... LIKE 'demo-%' más las
cuentas legacy con isDemo=1. NO toca shard_registry ni allocation_state
(infraestructura) ni auditoría (histórico inmutable).

Requiere: export CLOUDFLARE_API_TOKEN=... (D1:edit, cuenta de MenRut)."""
import json
import os
import sys
import time
import urllib.request

ACC = "57efaa518a543ded7b31b026b6d83dc4"
CORE = "04ef4293-1645-4fc1-8335-cae8031aab8e"
SHARDS = {
    1: "a43aded8-02ca-411d-8df2-4e182452dcfe",
    2: "d68ed896-7b4c-437b-a71d-112c8651de74",
    3: "8b0eea8a-dba2-42d3-8738-cc174cc7576f",
    4: "7c7bdc9f-b176-4086-a1c5-473fcf6da6ad",
    5: "a7c66be8-193e-4f17-bbb8-dde072ff4a0c",
    6: "bc4e47e0-0982-468e-bf52-1463862277de",
    7: "a3b279b5-149f-4406-9523-ceb99ed8b98e",
    8: "6a4df4e5-1e00-41b4-a454-d3fe4e2b63d0",
    9: "0d253c60-883e-4ca3-9717-679cbf98b580",
}
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database"
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not TOKEN:
    sys.exit("Falta CLOUDFLARE_API_TOKEN en el entorno.")

# Columnas que pueden referenciar a un actor demo (v3 snake_case + legacy camelCase).
REF_COLS = [
    "user_id", "courier_id", "author_id", "client_id", "reporter_id", "sender_id",
    "userId", "courierId", "authorId", "clientId", "reporterId", "senderId",
]
# Tablas de auditoría/histórico que NO se tocan (integridad del registro).
SKIP_TABLES = {"audit_events", "audit_logs", "AuditLog", "shard_registry",
               "allocation_state", "reconciliation_runs", "d1_migrations",
               "processed_events", "sync_inbox", "sync_failures", "_cf_KV"}


def api(url, body=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    if not data.get("success"):
        raise RuntimeError(json.dumps(data.get("errors"))[:300])
    return data["result"]


def query(db, sql, params=None):
    return api(f"{BASE}/{db}/query", {"sql": sql, "params": params or []})[0]["results"]


def cols_of(db, table):
    return [c["name"] for c in query(db, f"PRAGMA table_info({table})")]


def demo_where(table_cols):
    refs = [c for c in table_cols if c in REF_COLS]
    if not refs:
        return None
    return " OR ".join(f"{c} LIKE 'demo-%'" for c in refs)


def inventory(db, tables, label):
    found = {}
    for t in tables:
        if t in SKIP_TABLES:
            continue
        try:
            wc = demo_where(cols_of(db, t))
        except Exception:
            continue  # tabla inexistente
        if not wc:
            continue
        try:
            n = query(db, f"SELECT COUNT(*) AS n FROM {t} WHERE {wc}")[0]["n"]
        except Exception:
            continue
        if n:
            found[t] = n
    print(f"  {label}: {found if found else 'sin datos demo'}")
    return found


def backup_rows(db, tables, label, out):
    for t, n in tables.items():
        try:
            wc = demo_where(cols_of(db, t))
            rows = query(db, f"SELECT * FROM {t} WHERE {wc}")
            out.append({"db": label, "table": t, "rows": rows})
            print(f"    backup {label}.{t}: {len(rows)} filas")
        except Exception as e:
            print(f"    AVISO backup {label}.{t}: {e}")


def purge(db, tables, label):
    total = 0
    # hijos primero: el inventario lista padres (global_accounts, courier_profiles)
    # antes que sus hijos; en orden inverso los hijos se borran antes.
    for t in reversed(list(tables)):
        try:
            wc = demo_where(cols_of(db, t))
            if not wc:
                continue
            query(db, f"DELETE FROM {t} WHERE {wc}")
            total += 1
        except Exception as e:
            print(f"    ERROR borrando {label}.{t}: {e}")
    # legacy: cuentas marcadas isDemo=1 (columna camelCase o snake)
    for t in ("User", "CourierProfile"):
        try:
            c = cols_of(db, t)
            if "isDemo" in c:
                query(db, f"DELETE FROM {t} WHERE isDemo=1 AND id LIKE 'demo-%'")
            elif "is_demo" in c:
                query(db, f"DELETE FROM {t} WHERE is_demo=1 AND id LIKE 'demo-%'")
        except Exception:
            pass
    print(f"  {label}: {total} tablas limpiadas")
    return total


def legacy_purge(db, out, apply=False):
    """Legacy v1/v2: User isDemo=1 (ids cuid, email @menrut.demo) y sus hijos
    por id de perfil (Route.courierId etc. son cuids, no 'demo-%')."""
    demo_users = [r["id"] for r in query(db, "SELECT id FROM User WHERE isDemo=1")]
    demo_profiles = [r["id"] for r in query(db, "SELECT id FROM CourierProfile WHERE isDemo=1")]
    if not demo_users and not demo_profiles:
        print("  legacy: sin datos demo")
        return
    ids = demo_users + demo_profiles
    ph = ",".join("?" * len(ids))
    # tablas legacy con referencias por id (cuid) a User/CourierProfile demo
    legacy = ["Route", "CourierCoverage", "CourierService", "Review", "Favorite",
              "Membership", "Wallet", "WalletTransaction", "Notification",
              "SavedRoute", "Conversation", "Message", "VerificationRequest",
              "ReportFlag", "PaymentProof"]
    for t in legacy + ["CourierProfile", "User"]:
        try:
            cc = cols_of(db, t)
        except Exception:
            continue
        refs = [c for c in cc if c in ("courierId", "userId", "clientId", "authorId", "senderId")]
        if t in ("CourierProfile", "User"):
            where, params = ("isDemo=1", [])
        elif refs:
            where = " OR ".join(f"{c} IN ({ph})" for c in refs)
            params = ids * len(refs)
        else:
            continue
        try:
            rows = query(db, f"SELECT * FROM {t} WHERE {where}", params)
            if rows:
                print(f"    legacy {t}: {len(rows)} filas demo")
                if out is not None:
                    out.append({"db": "core-legacy", "table": t, "rows": rows})
                if apply:
                    query(db, f"DELETE FROM {t} WHERE {where}", params)
        except Exception as e:
            print(f"    AVISO legacy {t}: {e}")


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    print("── INVENTARIO de datos demo ──")
    core_tables = [r["name"] for r in query(CORE, "SELECT name FROM sqlite_master WHERE type='table'")]
    core_demo = inventory(CORE, core_tables, "menrut-core")
    shard_demo = {}
    for sid, uuid in sorted(SHARDS.items()):
        tables = [r["name"] for r in query(uuid, "SELECT name FROM sqlite_master WHERE type='table'")]
        shard_demo[sid] = inventory(uuid, tables, f"shard-0{sid}")
    print("  legacy (isDemo=1):")
    legacy_purge(CORE, None, apply=False)

    if not apply:
        print("\n(modo lectura: ejecuta con --apply para respaldar y borrar)")
        sys.exit(0)

    print("\n── BACKUP (backups/demo-backup-*.json) ──")
    os.makedirs("backups", exist_ok=True)
    out = []
    backup_rows(CORE, core_demo, "core", out)
    for sid, uuid in sorted(SHARDS.items()):
        backup_rows(uuid, shard_demo[sid], f"shard-0{sid}", out)
    legacy_purge(CORE, out, apply=False)  # recolecta filas legacy para el respaldo
    ts = time.strftime("%Y%m%d-%H%M%S")
    path = f"backups/demo-backup-{ts}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"  respaldo completo → {path} ({sum(len(b['rows']) for b in out)} filas)")

    print("\n── BORRADO ──")
    purge(CORE, core_demo, "menrut-core")
    for sid, uuid in sorted(SHARDS.items()):
        purge(uuid, shard_demo[sid], f"shard-0{sid}")
    legacy_purge(CORE, None, apply=True)

    print("\n── VERIFICACIÓN (debe ser todo 0) ──")
    ok = True
    rem_core = inventory(CORE, core_tables, "menrut-core")
    if rem_core:
        ok = False
    for sid, uuid in sorted(SHARDS.items()):
        tables = [r["name"] for r in query(uuid, "SELECT name FROM sqlite_master WHERE type='table'")]
        rem = inventory(uuid, tables, f"shard-0{sid}")
        if rem:
            ok = False
    # proyección y directorio explícitos
    p = query(CORE, "SELECT COUNT(*) AS n FROM public_courier_directory")[0]["n"]
    g = query(CORE, "SELECT COUNT(*) AS n FROM global_accounts WHERE user_id LIKE 'demo-%'")[0]["n"]
    print(f"  proyección total (real+demo): {p} | global_accounts demo: {g}")
    print("\nLISTO: producción sin datos demo." if ok and g == 0 else "\nATENCIÓN: quedan filas demo (ver arriba).")
