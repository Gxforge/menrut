#!/usr/bin/env python3
"""Análisis: qué referencias usan ids v1 (slug) vs v2 (cuid) en producción."""
import json, os, urllib.request

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
