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

ACC = "665fb2e43961e57d2f22283c6dec7d5c"  # verificado: d1.py / d1q.py
CORE = "3383e764-c3a3-40d9-aa71-38f07cfb205a"  # verificado: wrangler.json menrut-core
SHARDS = {  # verificado: wrangler.json menrut-shard-01 .. 09
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
