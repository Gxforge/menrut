#!/usr/bin/env python3
"""Migra shards 03-09 (esquema completo) y registra los 9 shards en el
round-robin de menrut-core con su tamaño real medido (igual que
measure_shards.py). Al terminar: 10 bases D1 operativas (core + 9 shards)."""
import json
import os
import time
import urllib.request

ACC = "665fb2e43961e57d2f22283c6dec7d5c"
TOK = os.environ.get("CLOUDFLARE_API_TOKEN", "")  # nunca escribir el token en el código
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
MIGRATIONS = [
    open("/home/z/menrut-repo/database/shard/migrations/0001_courier.sql").read(),
    open("/home/z/menrut-repo/database/shard/migrations/0002_settlement_ledger.sql").read(),
    open("/home/z/menrut-repo/database/shard/migrations/0003_coverage_types.sql").read(),
]


def api(url, body=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        headers={
            "Authorization": "Bearer " + TOK,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if not data.get("success"):
        raise RuntimeError(json.dumps(data.get("errors"))[:300])
    return data["result"]


def db_info(uuid):
    return api(BASE + "/" + uuid)


# 1) Migrar shards 03-09 (los 01-02 ya tienen el esquema)
for sid in range(3, 10):
    uuid = SHARDS[sid]
    info = db_info(uuid)
    if info.get("num_tables", 0) >= 9:
        print(f"shard-{sid:02}: esquema ya presente ({info['num_tables']} tablas)")
        continue
    for i, sql in enumerate(MIGRATIONS, 1):
        api(BASE + "/" + uuid + "/query", {"sql": sql})
        print(f"shard-{sid:02}: migración 000{i} aplicada")
    time.sleep(1)

# 2) Registrar los 9 shards en shard_registry con tamaño real medido
for sid, uuid in sorted(SHARDS.items()):
    info = db_info(uuid)
    size = info.get("file_size")
    if not isinstance(size, int):
        raise RuntimeError(f"shard-{sid:02}: sin file_size real")
    api(
        BASE + "/" + CORE + "/query",
        {
            "sql": (
                "INSERT INTO shard_registry(shard_id,binding,enabled,size_bytes,measured_at) "
                "VALUES(?,?,1,?,unixepoch()) ON CONFLICT(shard_id) DO UPDATE SET "
                "size_bytes=excluded.size_bytes, measured_at=excluded.measured_at, enabled=1"
            ),
            "params": [sid, f"D1_SHARD_{sid:02}", size],
        },
    )
    print(f"shard-{sid:02}: registrado ({size} bytes)")

# 3) Verificación final
rows = api(BASE + "/" + CORE + "/query", {"sql": "SELECT shard_id,binding,enabled,size_bytes FROM shard_registry ORDER BY shard_id"})[0]["results"]
print("\nshard_registry final:")
for row in rows:
    print(" ", row)
print("TOTAL SHARDS ACTIVOS:", len(rows))
