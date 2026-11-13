#!/usr/bin/env python3
"""Migra shards 03-09 (esquema completo) y registra los 9 shards en el
round-robin de menrut-core con su tamaño real medido (igual que
measure_shards.py). Al terminar: 10 bases D1 operativas (core + 9 shards)."""
import json
import os
import time
import urllib.request

ACC = "57efaa518a543ded7b31b026b6d83dc4"
TOK = os.environ.get("CLOUDFLARE_API_TOKEN", "")  # nunca escribir el token en el código
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
