#!/usr/bin/env python3
"""MENRUT v3 — Generador de siembra de mensajeros DEMO (arquitectura sharded).

Lee el volcado legacy (/tmp/demo-legacy.json, extraído de producción) y genera
SQL idempotente para las 10 bases:
  .seed/core.sql     → cuentas demo, mapa de shards, registro round-robin y
                       proyección pública completa (routes_json incluido).
  .seed/shard-NN.sql → perfil, cartera (90 días), servicios, cobertura, rutas
                       y reseñas demo de cada mensajero en su shard dueño.

Los mensajeros demo quedan marcados is_demo=1 en shard y proyección: nunca se
muestran como reales. Identidades demo nunca coinciden con un sub de Supabase.
Uso:  python3 scripts/seed-demo-v3.py [ruta-del-volcado.json] [dir-salida]
"""
import json, sys, time

LEGACY = sys.argv[1] if len(sys.argv) > 1 else '/tmp/demo-legacy.json'
OUTDIR = sys.argv[2] if len(sys.argv) > 2 else '.seed'
NOW = int(time.time())
PERMANENCE = 90 * 86400  # 90 días de vigencia demo
EXPIRES = NOW + PERMANENCE

data = json.load(open(LEGACY))
mun_province = data.get('munProvince', {})
users = {u['id']: u for u in data['users']}
profiles = {p['userId']: p for p in data['profiles']}
services = {}
for s in data['services']:
    services.setdefault(s['courierId'], []).append(s['serviceType'])
coverage = {}
for c in data['coverage']:
    coverage.setdefault(c['courierId'], []).append(c['municipalityId'])
routes = {}
for r in data['routes']:
    routes.setdefault(r['courierId'], []).append(r)

DEMO_CLIENTS = [
    ('demo-client-1', 'Ana Pérez'), ('demo-client-2', 'Luis Gómez'),
    ('demo-client-3', 'Marta Rodríguez'), ('demo-client-4', 'Yanet Cruz'),
    ('demo-client-5', 'Carlos Fernández'), ('demo-client-6', 'Rosa Miranda'),
    ('demo-client-7', 'Pedro Soto'), ('demo-client-8', 'Ivette Núñez'),
]
REVIEW_TEXTS = [
    'Excelente servicio, llegó todo rápido y en perfecto estado. Recomendado.',
    'Muy puntual y comunicativo. Lo contacté por la app y sin problemas.',
    'Servicio serio, cuida los paquetes. Volveré a contratarlo.',
    'Rápido y confiable, trato amable. La mejor opción de la zona.',
]

def esc(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("'", "''")
    return f"'{s}'"

def route_json(items):
    out = []
    for r in items:
        if r.get('status') not in ('active', 'scheduled'):
            continue
        out.append({
            'origin_id': r.get('originMunicipalityId'),
            'destination_id': r.get('destinationMunicipalityId'),
            'origin_province_id': r.get('originProvinceId'),
            'destination_province_id': r.get('destinationProvinceId'),
            'scope': r.get('scope') or 'municipal',
            'stops': r.get('stops') or '',
            'frequency': r.get('frequency') or 'personalizada',
            'days_note': r.get('daysNote') or '',
            'service_type': r.get('serviceType') or 'paquetes',
            'vehicle_type': r.get('vehicleType') or 'motor',
            'fee_cup': r.get('feeCup'),
            'status': r.get('status'),
            'next_departure_at': r.get('nextDepartureAt'),
            'notes': r.get('notes') or '',
        })
    return json.dumps(out, ensure_ascii=False, separators=(',', ':'))

# ── Asignación de shards (equivalente al allocator: 1..9 cíclico) ──────────
ordered = sorted(profiles.keys(), key=lambda uid: profiles[uid]['id'])
assign = {}
for i, uid in enumerate(ordered):
    assign[uid] = (i % 9) + 1

core, shards = [], {n: [] for n in range(1, 10)}

# Registro de shards y puntero round-robin (idempotente).
for n in range(1, 10):
    core.append(
        f"INSERT OR IGNORE INTO shard_registry(shard_id,binding,enabled,measured_at,size_bytes) "
        f"VALUES({n},'D1_SHARD_{n:02d}',1,{NOW},122880);")
core.append("INSERT OR IGNORE INTO allocation_state(id,last_shard) VALUES(1,0);")

# Cuentas demo de clientes (autores de reseñas).
for cid, name in DEMO_CLIENTS:
    core.append(f"INSERT OR IGNORE INTO global_accounts(user_id) VALUES('{cid}');")
    core.append(f"UPDATE global_accounts SET status='active' WHERE user_id='{cid}';")
    core.append(
        f"INSERT INTO account_profiles(user_id,email,full_name,updated_at) VALUES('{cid}','',{esc(name)},{NOW}) "
        f"ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name;")

for uid, prof in profiles.items():
    user = users[uid]
    did = f"demo-{uid}"
    sid = assign[uid]
    muns = coverage.get(prof['id'], [])
    base_mun = muns[0] if muns else None
    base_prov = mun_province.get(base_mun) if base_mun else None
    svc = services.get(prof['id'], [])
    rts = routes.get(prof['id'], [])

    # ── CORE: identidad global + mapa + proyección ──
    core.append(f"INSERT OR IGNORE INTO global_accounts(user_id) VALUES('{did}');")
    core.append(f"UPDATE global_accounts SET status='active' WHERE user_id='{did}';")
    core.append(
        f"INSERT INTO account_profiles(user_id,email,full_name,avatar_path,updated_at) "
        f"VALUES('{did}',{esc(user.get('email') or '')},{esc(user['fullName'])},{esc(user.get('avatarUrl'))},{NOW}) "
        f"ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name, avatar_path=excluded.avatar_path;")
    core.append(f"INSERT OR IGNORE INTO user_roles(user_id,role) VALUES('{did}','courier');")
    core.append(
        f"INSERT OR IGNORE INTO courier_shard_map(user_id,shard_id,status,assigned_at) "
        f"VALUES('{did}',{sid},'active',{NOW});")

    # ── SHARD: perfil + cartera + servicios + cobertura + rutas ──
    sh = shards[sid]
    verified = 1 if prof.get('verificationStatus') == 'verified' else 0
    sh.append(
        f"INSERT INTO courier_profiles(user_id,slug,name,description,province_id,municipality_id,photo_path,"
        f"available,visible,version,updated_at,coverage_type,availability_note,vehicle_summary,base_fee_cup,"
        f"years_experience,contact_preference,verification_status,is_demo,rating_sum,rating_count,verified_deliveries) "
        f"VALUES('{did}','{did}',{esc(user['fullName'])},{esc(prof.get('bio') or '')},"
        f"{esc(base_prov)},{esc(base_mun)},{esc(user.get('avatarUrl'))},"
        f"1,1,1,{NOW},{esc(prof.get('coverageType') or 'municipal')},{esc(prof.get('availabilityNote') or '')},"
        f"{esc(prof.get('vehicleSummary') or '')},{esc(prof.get('baseFeeCup'))},{int(prof.get('yearsExperience') or 0)},"
        f"{esc(prof.get('contactPreference') or 'chat')},{esc(prof.get('verificationStatus') or 'unverified')},1,"
        f"%RATING_SUM%,%RATING_COUNT%,{int(prof.get('verifiedDeliveries') or 0)}) "
        f"ON CONFLICT(user_id) DO NOTHING;")
    sh.append(
        f"INSERT INTO credit_wallets(user_id,permanence_seconds,tool_credits,settled_at,expires_at,plan_id) "
        f"VALUES('{did}',{PERMANENCE},50,{NOW},{EXPIRES},'basic') "
        f"ON CONFLICT(user_id) DO UPDATE SET permanence_seconds={PERMANENCE}, expires_at={EXPIRES};")
    sh.append(
        f"INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) "
        f"VALUES('demo:{did}','{did}','permanence',{PERMANENCE},{PERMANENCE},'demo:seed');")
    for s in svc:
        sh.append(
            f"INSERT OR IGNORE INTO courier_services(id,user_id,name,price_minor) "
            f"VALUES('svc-{did}-{s}','{did}','{s}',0);")
    for m in muns:
        sh.append(f"INSERT OR IGNORE INTO courier_coverage(user_id,municipality_id) VALUES('{did}',{esc(m)});")
    for r in rts:
        sh.append(
            f"INSERT INTO courier_routes(id,user_id,origin_id,destination_id,origin_province_id,destination_province_id,"
            f"scope,stops,frequency,days_note,service_type,vehicle_type,fee_cup,status,next_departure_at,notes,is_demo,created_at,updated_at) "
            f"VALUES({esc(r['id'])},'{did}',{esc(r.get('originMunicipalityId'))},{esc(r.get('destinationMunicipalityId'))},"
            f"{esc(r.get('originProvinceId'))},{esc(r.get('destinationProvinceId'))},{esc(r.get('scope') or 'municipal')},"
            f"{esc(r.get('stops') or '')},{esc(r.get('frequency') or 'personalizada')},{esc(r.get('daysNote') or '')},"
            f"{esc(r.get('serviceType') or 'paquetes')},{esc(r.get('vehicleType') or 'motor')},{esc(r.get('feeCup'))},"
            f"{esc(r.get('status') or 'active')},{esc(r.get('nextDepartureAt'))},{esc(r.get('notes') or '')},1,"
            f"{esc(r.get('createdAt'))},{NOW}) "
            f"ON CONFLICT(id) DO NOTHING;")

    # ── Reseñas demo coherentes con la valoración legacy ──
    avg = float(prof.get('ratingAvg') or 0)
    n = 3
    ratings = [5, 5, 4] if avg >= 4.5 else ([5, 4, 4] if avg >= 4 else [4, 4, 3])
    rating_sum, rating_count = sum(ratings), len(ratings)
    for i, rt in enumerate(ratings):
        author = DEMO_CLIENTS[(sum(ord(c) for c in uid) + i) % len(DEMO_CLIENTS)]
        sh.append(
            f"INSERT OR IGNORE INTO reviews(id,courier_id,author_id,rating,comment,is_verified,status,created_at) "
            f"VALUES('rev-{did}-{i}','{did}','{author[0]}',{rt},{esc(REVIEW_TEXTS[i % len(REVIEW_TEXTS)])},1,'published',"
            f"{(NOW - i * 86400) * 1000});")

    # Sustituir marcadores de rating.
    sh = [s.replace('%RATING_SUM%', str(rating_sum)).replace('%RATING_COUNT%', str(rating_count)) for s in sh[-len(sh):]]
    shards[sid] = sh

    # ── Proyección CORE (idéntica a syncProjection) ──
    core.append(
        f"INSERT INTO public_courier_directory(user_id,slug,name,description,province_id,municipality_id,photo_path,"
        f"available,visible,expires_at,version,updated_at,rating_sum,review_count,coverage_type,vehicle_summary,"
        f"availability_note,base_fee_cup,years_experience,contact_preference,verified_deliveries,is_verified,is_demo,"
        f"services_csv,coverage_csv,routes_json) "
        f"VALUES('{did}','{did}',{esc(user['fullName'])},{esc(prof.get('bio') or '')},"
        f"{esc(base_prov)},{esc(base_mun)},{esc(user.get('avatarUrl'))},"
        f"1,1,{EXPIRES},1,{NOW},{rating_sum},{rating_count},{esc(prof.get('coverageType') or 'municipal')},"
        f"{esc(prof.get('vehicleSummary') or '')},{esc(prof.get('availabilityNote') or '')},{esc(prof.get('baseFeeCup'))},"
        f"{int(prof.get('yearsExperience') or 0)},{esc(prof.get('contactPreference') or 'chat')},"
        f"{int(prof.get('verifiedDeliveries') or 0)},{verified},1,{esc(','.join(svc))},{esc(','.join(muns))},"
        f"{esc(route_json(rts))}) "
        f"ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, description=excluded.description, "
        f"photo_path=excluded.photo_path, expires_at=excluded.expires_at, rating_sum=excluded.rating_sum, "
        f"review_count=excluded.review_count, services_csv=excluded.services_csv, coverage_csv=excluded.coverage_csv, "
        f"routes_json=excluded.routes_json, is_demo=1, visible=1;")

# Puntero round-robin tras las 11 asignaciones (1..9,1,2 → último = 2).
core.append("UPDATE allocation_state SET last_shard=2 WHERE id=1;")

import os
os.makedirs(OUTDIR, exist_ok=True)
core = [c for c in core if c != 'SELECT 1;']
NL = chr(10)
open(f'{OUTDIR}/core.sql', 'w').write(NL.join(x.strip().rstrip(';') + ';' for x in core) + NL)
for n in range(1, 10):
    open(f'{OUTDIR}/shard-{n:02d}.sql', 'w').write(NL.join(x.strip().rstrip(';') + ';' for x in shards[n]) + NL if shards[n] else 'SELECT 1;' + NL)
print(f"OK: {len(core)} sentencias CORE; shards:",
      ', '.join(f"{n:02d}→{len(shards[n])}" for n in range(1, 10)))
