"""Aplica core 0009 y shard 0006 (código por chat) de forma idempotente.

Solo ejecuta las columnas que faltan. Las sentencias CREATE INDEX IF NOT EXISTS son seguras de repetir.
Uso:  CLOUDFLARE_API_TOKEN=... python3 apply_chat_codes.py [--dry]
Sin --dry solo se ejecuta tras la confirmación del titular.
"""
from pathlib import Path
import json
import os
import re
import sys
import urllib.error
import urllib.request

ACC = "57efaa518a543ded7b31b026b6d83dc4"  # verificado: d1.py / d1q.py
CORE = "04ef4293-1645-4fc1-8335-cae8031aab8e"  # verificado: wrangler.json menrut-core
SHARDS = {  # verificado: wrangler.json menrut-shard-01 .. 09
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
REPO = str(Path(__file__).resolve().parents[1] / "database")
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not TOKEN:
    sys.exit("Falta CLOUDFLARE_API_TOKEN")
DRY = "--dry" in sys.argv


def q(db, sql, params=None):
    body = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACC}/d1/database/{db}/query",
        data=body,
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        d = json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read()[:300].decode(errors="replace"))
    if not d.get("success"):
        raise RuntimeError(str(d.get("errors"))[:300])
    return d["result"][0]["results"]


def cols(db, table):
    return {r["name"] for r in q(db, f"PRAGMA table_info({table})")}


def statements(path):
    text = open(path, encoding="utf-8").read()
    text = re.sub(r"--[^\n]*", "", text)
    return [s.strip() for s in text.split(";") if s.strip()]


def plan_core():
    m = cols(CORE, "messages")
    c = cols(CORE, "conversations")
    out = []
    for stmt in statements(f"{REPO}/core/migrations/0009_chat_codes.sql"):
        if stmt.startswith("ALTER TABLE messages ADD COLUMN kind") and "kind" in m:
            continue
        if stmt.startswith("ALTER TABLE messages ADD COLUMN ref_id") and "ref_id" in m:
            continue
        if stmt.startswith("ALTER TABLE messages ADD COLUMN payload") and "payload" in m:
            continue
        if stmt.startswith("ALTER TABLE conversations ADD COLUMN hired_at") and "hired_at" in c:
            continue
        out.append(stmt)
    return out


def plan_shard(db):
    dv = cols(db, "delivery_verifications")
    out = []
    for stmt in statements(f"{REPO}/shard/migrations/0006_delivery_chat.sql"):
        skip = False
        for col in ("conversation_id", "client_confirmed_at", "cancelled_at"):
            if stmt.startswith(f"ALTER TABLE delivery_verifications ADD COLUMN {col}") and col in dv:
                skip = True
        if not skip:
            out.append(stmt)
    return out


def run(label, db, stmts):
    print(f"{label}: {len(stmts)} sentencia(s) pendiente(s)")
    for s in stmts:
        print("   ", s[:110])
        if not DRY:
            q(db, s)


run("CORE", CORE, plan_core())
for sid, db in SHARDS.items():
    run(f"SHARD {sid:02d}", db, plan_shard(db))
print("hecho" if not DRY else "simulación (sin cambios)")
