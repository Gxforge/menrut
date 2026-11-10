// MENRUT v2 — Cuenta y sociales: sync de identidad global (con asignación de
// shard para mensajeros), perfil propio, denuncias (→ shard del mensajero),
// favoritos y rutas guardadas del cliente.
import {
  asBool,
  asString,
  checkRate,
  HttpError,
  newId,
  nowMs,
  verifySupabaseToken,
  type V2Env,
} from './core';
import { resolveAccount, requireAuth, loadAccount, type DbUser } from './identity';
import { assignedShard, ownShard, syncProjection } from './shard';
import { activateTrial } from './wallet';
import { toSessionUser } from './dto';

// ─── POST /auth/sync ────────────────────────────────────────────────────────
// Sincroniza la identidad Supabase con la cuenta global; si es mensajero,
// asegura su shard propietario (round-robin persistente), el perfil del shard,
// la cartera y la prueba gratuita si corresponde. Nunca reasigna shards.
export async function authSync(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const identity = await verifySupabaseToken(request, env);
  if (!identity) throw new HttpError(401, 'Sesión no válida. Inicia sesión de nuevo.');
  if (!identity.email) throw new HttpError(400, 'La cuenta no tiene correo asociado.');
  await checkRate(env, `sync:${identity.sub}`, 30, 60_000);

  const user = await resolveAccount(env, identity, asString(body?.role));

  if (user.role === 'courier') {
    await provisionCourier(env, user);
  }
  return { user: toSessionUser(user) };
}

/** Crea (una sola vez) el perfil + cartera del shard y sincroniza la proyección. */
async function provisionCourier(env: V2Env, user: DbUser): Promise<void> {
  const { db } = await ownShard(env, user.id);
  const nowSec = Math.floor(nowMs() / 1000);
  const existing = await db.prepare('SELECT 1 AS ok FROM courier_profiles WHERE user_id=?').bind(user.id).first();
  if (!existing) {
    await db.batch([
      db
        .prepare('INSERT OR IGNORE INTO courier_profiles(user_id,slug,name) VALUES(?,?,?)')
        .bind(user.id, user.id, user.fullName || 'Mensajero'),
      db
        .prepare(
          `INSERT OR IGNORE INTO credit_wallets(user_id,permanence_seconds,settled_at,expires_at)
           VALUES(?,0,?,?)`
        )
        .bind(user.id, nowSec, nowSec),
      db
        .prepare(
          `INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id)
           SELECT 'initial:'||user_id, user_id, 'permanence', 0, 0, 'initial'
           FROM credit_wallets WHERE user_id=?`
        )
        .bind(user.id),
      db
        .prepare('INSERT OR IGNORE INTO shard_outbox(id,user_id,version) VALUES(?,?,1)')
        .bind(`profile:${user.id}:1`, user.id),
    ]);
    // Prueba gratuita: una sola vez por cuenta (registro global en trial_claims).
    if (!user.hasUsedTrial) {
      await activateTrial(env, user.id).catch(() => null);
    }
  }
  // Alta completa: la asignación pasa a activa y la proyección queda fresca.
  await env.D1_CORE
    .prepare("UPDATE courier_shard_map SET status='active' WHERE user_id=? AND status='provisioning'")
    .bind(user.id)
    .run();
  await syncProjection(env, user.id).catch(() => null);
}

// ─── PATCH /me ──────────────────────────────────────────────────────────────
export async function updateMe(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const db = env.D1_CORE;

  const patch: string[] = [];
  const values: unknown[] = [];
  if ('fullName' in body) {
    const fullName = asString(body.fullName)?.trim() ?? '';
    if (!fullName) throw new HttpError(400, 'El nombre no puede estar vacío.');
    if (fullName.length > 80) throw new HttpError(400, 'El nombre es demasiado largo.');
    patch.push('full_name=?');
    values.push(fullName);
  }
  if ('phone' in body) {
    const phone = body.phone;
    if (phone === null || phone === '') {
      patch.push('phone=NULL');
    } else {
      const p = asString(phone)?.trim() ?? '';
      if (p && !/^[+0-9\s()-]{5,25}$/.test(p)) throw new HttpError(400, 'El teléfono no tiene un formato válido.');
      patch.push('phone=?');
      values.push(p || null);
    }
  }
  if ('avatarUrl' in body) {
    const avatar = body.avatarUrl;
    if (avatar === null || avatar === '') {
      patch.push('avatar_path=NULL');
    } else {
      const a = asString(avatar)?.trim() ?? '';
      if (a.length > 500) throw new HttpError(400, 'La URL del avatar es demasiado larga.');
      patch.push('avatar_path=?');
      values.push(a || null);
    }
  }
  if (patch.length === 0) throw new HttpError(400, 'Nada que actualizar.');

  values.push(Math.floor(nowMs() / 1000), user.id);
  await db.prepare(`UPDATE account_profiles SET ${patch.join(',')}, updated_at=? WHERE user_id=?`).bind(...values).run();

  // Si es mensajero, el nombre/avatar viven también en la proyección pública:
  // se versiona el perfil del shard y se reintenta la sincronización.
  if (user.role === 'courier' && (patch.includes('full_name=?') || patch.includes('avatar_path=?'))) {
    const shard = await assignedShard(env, user.id);
    if (shard) {
      const fresh = await loadAccount(env, user.id);
      await shard.db
        .prepare('UPDATE courier_profiles SET name=?, updated_at=unixepoch() WHERE user_id=?')
        .bind(fresh?.fullName ?? 'Mensajero', user.id)
        .run();
      const version = await shard.db
        .prepare('UPDATE courier_profiles SET version=version+1 WHERE user_id=? RETURNING version')
        .bind(user.id)
        .first<{ version: number }>();
      if (version) {
        await shard.db
          .prepare('INSERT OR IGNORE INTO shard_outbox(id,user_id,version) VALUES(?,?,?)')
          .bind(`profile:${user.id}:${version.version}`, user.id, version.version)
          .run();
        await syncProjection(env, user.id).catch(() => null);
      }
    }
  }

  const updated = await loadAccount(env, user.id);
  return { user: toSessionUser(updated ?? user) };
}

// ─── POST /reports (denuncia → shard del mensajero involucrado) ─────────────
export async function createReport(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `report:${user.id}`, 10, 60 * 60_000);

  const TARGET_TYPES = ['profile', 'review', 'conversation'];
  const targetType = asString(body.targetType)?.trim() ?? 'profile';
  const targetId = asString(body.targetId)?.trim() ?? '';
  const reason = asString(body.reason)?.trim() ?? '';
  if (!TARGET_TYPES.includes(targetType)) throw new HttpError(400, 'Tipo de reporte no válido.');
  if (!targetId) throw new HttpError(400, 'Falta el elemento a reportar.');
  if (reason.length < 5 || reason.length > 500) {
    throw new HttpError(400, 'Describe el motivo del reporte (entre 5 y 500 caracteres).');
  }

  // El shard dueño: el mensajero reportado (perfil), el dueño de la reseña o
  // el mensajero de la conversación. Los datos operativos viven en su shard.
  let courierId: string | null = null;
  if (targetType === 'profile') {
    courierId = targetId;
  } else if (targetType === 'conversation') {
    const conv = await env.D1_CORE
      .prepare('SELECT courier_id AS courierId FROM conversations WHERE id=? LIMIT 1')
      .bind(targetId)
      .first<{ courierId: string }>();
    courierId = conv?.courierId ?? null;
  } else {
    courierId = await findReviewOwner(env, targetId);
  }
  const shard = courierId ? await assignedShard(env, courierId) : null;
  if (!shard) throw new HttpError(404, 'El elemento reportado no existe o ya no está disponible.');

  await shard.db
    .prepare(
      `INSERT INTO report_flags(id,courier_id,reporter_id,target_type,target_id,reason,status,created_at)
       VALUES(?,?,?,?,?,?,'open',?)`
    )
    .bind(newId(), courierId, user.id, targetType, targetId, reason, nowMs())
    .run();
  return { ok: true };
}

/** Busca el dueño de una reseña entre los shards habilitados (acción rara). */
async function findReviewOwner(env: V2Env, reviewId: string): Promise<string | null> {
  const registry = await env.D1_CORE
    .prepare('SELECT shard_id FROM shard_registry WHERE enabled=1')
    .all();
  for (const r of ((registry.results ?? []) as Array<{ shard_id: number }>)) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) continue;
    const row = await db.prepare('SELECT courier_id AS courierId FROM reviews WHERE id=? LIMIT 1').bind(reviewId).first<{ courierId: string }>();
    if (row) return row.courierId;
  }
  return null;
}

// ─── /favorites (cliente → mensajero, identidad global) ─────────────────────
export async function listFavorites(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare(
      `SELECT d.*, p.avatar_path AS avatarUrl FROM favorites f
       JOIN public_courier_directory d ON d.user_id = f.courier_id
       LEFT JOIN account_profiles p ON p.user_id = f.courier_id
       WHERE f.user_id=? ORDER BY f.created_at DESC`
    )
    .bind(user.id)
    .all();
  const now = nowMs();
  const couriers = ((rows.results ?? []) as Array<Record<string, unknown>>).map((d) => {
    let nextDeparture: number | null = null;
    try {
      for (const r of JSON.parse((d.routes_json as string) || '[]') as Array<{ nextDepartureAt: number | null }>) {
        if (r.nextDepartureAt && r.nextDepartureAt > now && (!nextDeparture || r.nextDepartureAt < nextDeparture)) {
          nextDeparture = r.nextDepartureAt;
        }
      }
    } catch {
      /* proyección sin rutas */
    }
    return {
      courierId: d.user_id,
      userId: d.user_id,
      fullName: d.name,
      avatarUrl: d.avatarUrl,
      isVerified: d.is_verified === 1,
      isFavorite: true,
      ratingAvg: (d.review_count as number) > 0 ? (d.rating_sum as number) / (d.review_count as number) : 0,
      ratingCount: d.review_count,
      verifiedDeliveries: d.verified_deliveries,
      vehicleSummary: d.vehicle_summary,
      availabilityNote: d.availability_note,
      feeCup: d.base_fee_cup,
      isDemo: d.is_demo === 1,
      coverageType: d.coverage_type,
      matchReasons: ['Guardado por ti'],
      coverage: (d.coverage_csv as string) ? (d.coverage_csv as string).split(',').filter(Boolean) : [],
      nextDepartureAt: nextDeparture ? new Date(nextDeparture).toISOString() : null,
    };
  });
  return { couriers };
}

export async function toggleFavorite(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const courierId = asString(body.courierId)?.trim() ?? '';
  if (!courierId) throw new HttpError(400, 'Falta el mensajero.');
  const exists = await env.D1_CORE
    .prepare('SELECT 1 AS ok FROM public_courier_directory WHERE user_id=? LIMIT 1')
    .bind(courierId)
    .first();
  if (!exists) throw new HttpError(404, 'Mensajero no encontrado.');

  const existing = await env.D1_CORE
    .prepare('SELECT 1 AS ok FROM favorites WHERE user_id=? AND courier_id=? LIMIT 1')
    .bind(user.id, courierId)
    .first();
  if (existing) {
    await env.D1_CORE.prepare('DELETE FROM favorites WHERE user_id=? AND courier_id=?').bind(user.id, courierId).run();
    return { favorite: false };
  }
  await env.D1_CORE
    .prepare('INSERT OR IGNORE INTO favorites(user_id,courier_id) VALUES(?,?)')
    .bind(user.id, courierId)
    .run();
  return { favorite: true };
}

// ─── /saved-routes (datos del cliente, globales en CORE) ────────────────────
export async function listSavedRoutes(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM saved_routes WHERE user_id=? ORDER BY created_at DESC')
    .bind(user.id)
    .all();
  const routes = [];
  for (const r of (rows.results ?? []) as Array<Record<string, unknown>>) {
    routes.push(await savedRouteDto(env, r));
  }
  return { routes };
}

async function savedRouteDto(env: V2Env, r: Record<string, unknown>): Promise<Record<string, unknown>> {
  const muns = await env.D1_CORE
    .prepare('SELECT id, name FROM Municipality WHERE id IN (?,?)')
    .bind(r.origin_municipality_id, r.destination_municipality_id)
    .all();
  const byId = new Map(((muns.results ?? []) as Array<{ id: string; name: string }>).map((m) => [m.id, m.name]));
  return {
    id: r.id,
    originId: r.origin_municipality_id,
    destinationId: r.destination_municipality_id,
    origin: byId.get(r.origin_municipality_id as string) ?? '',
    destination: byId.get(r.destination_municipality_id as string) ?? '',
    label: r.label,
    alertsEnabled: !!r.alerts_enabled,
    createdAt: new Date((r.created_at as number) * 1000).toISOString(),
  };
}

export async function createSavedRoute(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const originId = asString(body.originId)?.trim() ?? '';
  const destinationId = asString(body.destinationId)?.trim() ?? '';
  const label = (asString(body.label) ?? '').trim().slice(0, 60);
  const alertsEnabled = asBool(body.alertsEnabled) ?? true;

  if (!originId || !destinationId) throw new HttpError(400, 'Selecciona origen y destino.');
  if (originId === destinationId) throw new HttpError(400, 'El origen y el destino deben ser municipios distintos.');
  const muns = await env.D1_CORE.prepare('SELECT id FROM Municipality WHERE id IN (?,?)').bind(originId, destinationId).all();
  if ((muns.results ?? []).length !== 2) throw new HttpError(400, 'Municipio no válido.');

  const id = newId();
  await env.D1_CORE
    .prepare(
      'INSERT INTO saved_routes(id,user_id,origin_municipality_id,destination_municipality_id,label,alerts_enabled) VALUES(?,?,?,?,?,?)'
    )
    .bind(id, user.id, originId, destinationId, label, alertsEnabled ? 1 : 0)
    .run();
  const created = await env.D1_CORE.prepare('SELECT * FROM saved_routes WHERE id=?').bind(id).first() as unknown as Record<string, unknown>;
  return { route: await savedRouteDto(env, created) };
}

export async function deleteSavedRoute(request: Request, env: V2Env, id: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const res = await env.D1_CORE
    .prepare('DELETE FROM saved_routes WHERE id=? AND user_id=?')
    .bind(id, user.id)
    .run();
  if (!res.meta.changes) throw new HttpError(404, 'Ruta guardada no encontrada.');
  return { ok: true };
}
