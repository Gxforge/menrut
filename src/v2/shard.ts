// MENRUT v2 — Acceso a shards y sincronización outbox → proyección CORE.
// Cada mensajero tiene UN shard propietario (courier_shard_map) resuelto
// siempre en el servidor desde el JWT verificado; el navegador jamás envía
// shard_id. La asignación usa el allocator persistente v1 (INSERT SELECT +
// trigger transaccional, probado bajo concurrencia).
import { HttpError, type V2Env } from './core';

/** SQL del asignador round-robin persistente (idéntico a src/modules/allocation.ts). */
export const ALLOCATION_SQL = `INSERT INTO courier_shard_map(user_id,shard_id)
 SELECT ?,s.shard_id FROM shard_registry s,allocation_state a
 WHERE a.id=1 AND s.enabled=1 AND s.measured_at IS NOT NULL
 AND s.measured_at>=unixepoch()-2592000 AND s.size_bytes<s.capacity_bytes*0.95
 AND NOT EXISTS(SELECT 1 FROM courier_shard_map WHERE user_id=?)
 ORDER BY CASE WHEN s.shard_id>a.last_shard THEN 0 ELSE 1 END,s.shard_id
 LIMIT 1 ON CONFLICT(user_id) DO NOTHING`;

export function shardById(env: V2Env, id: number): D1Database {
  const db = env[`D1_SHARD_${String(id).padStart(2, '0')}`];
  if (!db) throw new HttpError(503, 'Shard no disponible temporalmente.');
  return db;
}

/** Shard propietario del mensajero; asigna con round-robin si no existe. */
export async function ownShard(env: V2Env, uid: string): Promise<{ shardId: number; db: D1Database }> {
  let map = await env.D1_CORE.prepare('SELECT shard_id FROM courier_shard_map WHERE user_id=?')
    .bind(uid)
    .first<{ shard_id: number }>();
  if (!map) {
    await env.D1_CORE.prepare(ALLOCATION_SQL).bind(uid, uid).run();
    map = await env.D1_CORE.prepare('SELECT shard_id FROM courier_shard_map WHERE user_id=?')
      .bind(uid)
      .first<{ shard_id: number }>();
  }
  if (!map) {
    throw new HttpError(503, 'No hay shards disponibles para registrar mensajeros. Contacta al soporte.');
  }
  return { shardId: map.shard_id, db: shardById(env, map.shard_id) };
}

/** Shard dueño ya asignado (sin asignar). null si el usuario no es mensajero. */
export async function assignedShard(env: V2Env, uid: string): Promise<{ shardId: number; db: D1Database } | null> {
  const map = await env.D1_CORE.prepare('SELECT shard_id FROM courier_shard_map WHERE user_id=?')
    .bind(uid)
    .first<{ shard_id: number }>();
  return map ? { shardId: map.shard_id, db: shardById(env, map.shard_id) } : null;
}

export interface RouteProjectionItem {
  originMunicipalityId: string | null;
  destinationMunicipalityId: string | null;
  originProvinceId: string | null;
  destinationProvinceId: string | null;
  scope: string;
  stops: string;
  frequency: string;
  daysNote: string;
  serviceType: string;
  vehicleType: string;
  feeCup: number | null;
  status: string;
  nextDepartureAt: number | null;
  notes: string;
}

/** Versiona el perfil del shard y encola el evento outbox (misma escritura). */
export async function bumpProfileVersion(env: V2Env, uid: string): Promise<number | null> {
  const shard = await assignedShard(env, uid);
  if (!shard) return null;
  const row = await shard.db
    .prepare(
      `UPDATE courier_profiles SET version=version+1, updated_at=unixepoch()
       WHERE user_id=? RETURNING version`
    )
    .bind(uid)
    .first<{ version: number }>();
  if (!row) return null;
  await shard.db
    .prepare('INSERT OR IGNORE INTO shard_outbox(id,user_id,version) VALUES(?,?,?)')
    .bind(`profile:${uid}:${row.version}`, uid, row.version)
    .run();
  return row.version;
}

/**
 * Sincroniza la proyección pública de CORE con el perfil del shard (outbox).
 * Idempotente y protegida por versiones: un evento viejo nunca revierte una
 * proyección más reciente. Si falla, el evento queda pendiente (reintentable).
 */
export async function syncProjection(env: V2Env, uid: string): Promise<void> {
  const shard = await assignedShard(env, uid);
  if (!shard) return;
  const db = shard.db;
  const p = await db
    .prepare(
      `SELECT p.*, w.expires_at, w.permanence_seconds,
       (SELECT IFNULL(GROUP_CONCAT(name), '') FROM courier_services WHERE user_id=p.user_id) AS services_csv,
       (SELECT IFNULL(GROUP_CONCAT(municipality_id), '') FROM courier_coverage WHERE user_id=p.user_id) AS coverage_csv
       FROM courier_profiles p JOIN credit_wallets w USING(user_id) WHERE p.user_id=?`
    )
    .bind(uid)
    .first<Record<string, string | number | null>>();
  if (!p) return;

  const routes = await db
    .prepare(
      `SELECT origin_id, destination_id, origin_province_id, destination_province_id, scope,
       stops, frequency, days_note, service_type, vehicle_type, fee_cup, status,
       next_departure_at, notes FROM courier_routes
       WHERE user_id=? AND status IN ('active','scheduled')`
    )
    .bind(uid)
    .all();
  const routesJson = JSON.stringify((routes.results ?? []) as Array<Record<string, unknown>>);

  const name = await env.D1_CORE
    .prepare('SELECT full_name FROM account_profiles WHERE user_id=?')
    .bind(uid)
    .first<{ full_name: string }>();

  const event = `profile:${uid}:${p.version}`;
  // La vigencia efectiva filtra el directorio: vencida → invisible (no se borra nada).
  const visible = p.visible === 1 && (p.expires_at as number) > Math.floor(Date.now() / 1000) ? 1 : 0;
  await env.D1_CORE.batch([
    env.D1_CORE.prepare(
      `INSERT INTO public_courier_directory
       (user_id,slug,name,description,province_id,municipality_id,photo_path,available,visible,
        expires_at,version,updated_at,rating_sum,review_count,coverage_type,vehicle_summary,
        availability_note,base_fee_cup,years_experience,contact_preference,verified_deliveries,
        is_verified,is_demo,services_csv,coverage_csv,routes_json,highlighted_until)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET
        name=excluded.name, description=excluded.description, province_id=excluded.province_id,
        municipality_id=excluded.municipality_id, photo_path=excluded.photo_path,
        available=excluded.available, visible=excluded.visible, expires_at=excluded.expires_at,
        version=excluded.version, updated_at=excluded.updated_at, rating_sum=excluded.rating_sum,
        review_count=excluded.review_count, coverage_type=excluded.coverage_type,
        vehicle_summary=excluded.vehicle_summary, availability_note=excluded.availability_note,
        base_fee_cup=excluded.base_fee_cup, years_experience=excluded.years_experience,
        contact_preference=excluded.contact_preference,
        verified_deliveries=excluded.verified_deliveries, is_verified=excluded.is_verified,
        is_demo=excluded.is_demo, services_csv=excluded.services_csv,
        coverage_csv=excluded.coverage_csv, routes_json=excluded.routes_json,
        highlighted_until=excluded.highlighted_until
       WHERE excluded.version>public_courier_directory.version`
    ).bind(
      uid, p.slug, name?.full_name ?? 'Mensajero', p.description, p.province_id, p.municipality_id,
      p.photo_path, p.available, visible, p.expires_at, p.version, p.updated_at,
      p.rating_sum, p.rating_count, p.coverage_type, p.vehicle_summary, p.availability_note,
      p.base_fee_cup, p.years_experience, p.contact_preference, p.verified_deliveries,
      p.verification_status === 'verified' ? 1 : 0, p.is_demo, p.services_csv, p.coverage_csv, routesJson,
      p.highlighted_until ?? 0,
    ),
    env.D1_CORE.prepare('INSERT OR IGNORE INTO sync_inbox(event_id) VALUES(?)').bind(event),
  ]);
  await db
    .prepare('UPDATE shard_outbox SET processed_at=unixepoch() WHERE user_id=? AND version<=? AND processed_at IS NULL')
    .bind(uid, p.version)
    .run();
}

/** Reintenta los eventos outbox pendientes de un mensajero (reconciliación). */
export async function retryPendingSync(env: V2Env, uid: string): Promise<void> {
  try {
    await syncProjection(env, uid);
  } catch {
    /* el evento queda pendiente; se reintenta en el próximo sync */
  }
}
