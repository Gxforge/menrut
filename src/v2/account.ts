// MENRUT v2 — Cuenta y sociales: sync de identidad global (con asignación de
// shard para mensajeros), perfil propio, denuncias (→ shard del mensajero),
// favoritos y rutas guardadas del cliente.
import { asString, checkRate, HttpError, newId, nowMs, verifySupabaseToken, type V2Env } from './core';
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
