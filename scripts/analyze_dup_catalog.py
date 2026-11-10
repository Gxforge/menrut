#!/usr/bin/env python3
"""Análisis: qué referencias usan ids v1 (slug) vs v2 (cuid) en producción."""
import json, os, urllib.request

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
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]


def q(db, sql):
    req = urllib.request.Request(
        f"{BASE}/{db}/query",
        data=json.dumps({"sql": sql}).encode(),
        headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if not data.get("success"):
        raise RuntimeError(json.dumps(data.get("errors"))[:300])
    return (data["result"] or [{}])[0].get("results", [])


print("── CORE ──")
print("provincias v1 (code LIKE 'v1-%'):", q(CORE, "SELECT COUNT(*) n FROM Province WHERE code LIKE 'v1-%'")[0]["n"])
print("municipios v1 (provincia con code v1):", q(CORE, "SELECT COUNT(*) n FROM Municipality m JOIN Province p ON p.id=m.provinceId WHERE p.code LIKE 'v1-%'")[0]["n"])
print("rutas con provincia v1:", q(CORE, "SELECT COUNT(*) n FROM Route r JOIN Province p ON p.id=r.originProvinceId WHERE p.code LIKE 'v1-%'")[0]["n"])
print("rutas con municipio v1 (origen):", q(CORE, "SELECT COUNT(*) n FROM Route r JOIN Municipality m ON m.id=r.originMunicipalityId JOIN Province p ON p.id=m.provinceId WHERE p.code LIKE 'v1-%'")[0]["n"])
print("rutas totales:", q(CORE, "SELECT COUNT(*) n FROM Route")[0]["n"])
rows = q(CORE, "SELECT coverage_csv FROM public_courier_directory WHERE coverage_csv IS NOT NULL AND coverage_csv!='' LIMIT 3")
print("muestra coverage_csv:", rows)
rows = q(CORE, "SELECT routes_json FROM public_courier_directory WHERE routes_json IS NOT NULL AND routes_json!='' LIMIT 1")
print("muestra routes_json:", str(rows)[:300])

print("\n── SHARDS (CourierCoverage con municipio v1) ──")
for n, db in SHARDS.items():
    try:
        total = q(db, "SELECT COUNT(*) n FROM CourierCoverage")[0]["n"]
        if total == 0:
            print(f"shard-0{n}: 0 filas")
            continue
        # los ids v1 de municipio empiezan por letra y no por 'c' de cuid? Mejor: no empiezan con 'cm'
        v1 = q(db, "SELECT COUNT(*) n FROM CourierCoverage WHERE substr(municipalityId,1,2)!='cm'")[0]["n"]
        print(f"shard-0{n}: total={total} v1-ish={v1}")
        if v1:
            print("   ejemplo:", q(db, "SELECT municipalityId FROM CourierCoverage WHERE substr(municipalityId,1,2)!='cm' LIMIT 3"))
    except Exception as e:
        print(f"shard-0{n}: ERROR {e}")
