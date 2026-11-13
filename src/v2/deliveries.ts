// MENRUT v2 — Entregas verificadas por OTP (delivery_verifications del shard
// dueño del mensajero). El CLIENTE genera un código de 6 dígitos desde el
// pasaporte del mensajero; cuando recibe su paquete se lo dicta al mensajero,
// quien lo introduce en su panel para acreditar la entrega verificada
// (+1 verified_deliveries). Una reseña vinculada a una entrega verificada
// queda marcada is_verified=1 (pasaporte y reputación).
import {
  asString,
  checkRate,
  HttpError,
  newId,
  nowMs,
  requireExactRole,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { assignedShard, syncProjection } from './shard';

export const DELIVERY_TTL_SEC = 86400; // 24 h de validez del código.
export const MAX_ATTEMPTS = 5;

export async function hashCode(id: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`menrut-otp:${id}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
  return String(n).padStart(6, '0');
}

function toDeliveryDto(r: Record<string, unknown>, clientName: string | null, withCode = false): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    id: r.id,
    courierId: r.courier_id,
    clientId: r.client_id,
    clientName,
    expiresAt: new Date((r.expires_at as number) * 1000).toISOString(),
    confirmedAt: r.confirmed_at ? new Date((r.confirmed_at as number) * 1000).toISOString() : null,
    status: r.confirmed_at ? 'verified' : (r.expires_at as number) <= Math.floor(nowMs() / 1000) ? 'expired' : 'pending',
  };
  if (withCode) dto.hasCode = true;
  return dto;
}

/** ─── POST /deliveries — el cliente genera el código de entrega ──────────── */
export async function createDelivery(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `delivery:${user.id}`, 10, 60 * 60_000);

  const courierId = asString(body.courierUserId)?.trim() ?? '';
  if (!courierId) throw new HttpError(400, 'Falta el mensajero de la entrega.');
  if (courierId === user.id) throw new HttpError(400, 'No puedes crear una entrega para ti mismo.');

  const shard = await assignedShard(env, courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');
  const profile = await shard.db
    .prepare('SELECT user_id FROM courier_profiles WHERE user_id=?')
    .bind(courierId)
    .first();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  // Un código pendiente por mensajero·cliente: se reemplaza el anterior.
  const nowSec = Math.floor(nowMs() / 1000);
  await shard.db
    .prepare('DELETE FROM delivery_verifications WHERE courier_id=? AND client_id=? AND confirmed_at IS NULL AND conversation_id IS NULL')
    .bind(courierId, user.id)
    .run();

  const id = newId();
  const code = randomCode();
  const codeHash = await hashCode(id, code);
  await shard.db
    .prepare('INSERT INTO delivery_verifications(id,courier_id,client_id,code_hash,expires_at,attempts) VALUES(?,?,?,?,?,0)')
    .bind(id, courierId, user.id, codeHash, nowSec + DELIVERY_TTL_SEC)
    .run();

  await env.D1_CORE
    .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'entrega','Código de entrega',?)")
    .bind(newId(), courierId, `${user.fullName} generó un código de entrega. Pídeselo al recibir tu paquete y verifícalo en Entregas.`)
    .run();

  return {
    delivery: { id, courierId, expiresAt: (nowSec + DELIVERY_TTL_SEC) * 1000, status: 'pending' },
    code,
    expiresInSec: DELIVERY_TTL_SEC,
  };
}

/** ─── GET /deliveries/mine — entregas del cliente (código visible si pendiente) ── */
export async function myDeliveries(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const registry = await env.D1_CORE.prepare('SELECT shard_id FROM shard_registry WHERE enabled=1').all();
  const nowSec = Math.floor(nowMs() / 1000);
  const deliveries: Array<Record<string, unknown>> = [];
  for (const r of ((registry.results ?? []) as Array<{ shard_id: number }>)) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) continue;
    const rows = (
      await db
        .prepare(
          'SELECT * FROM delivery_verifications WHERE client_id=? AND (confirmed_at IS NOT NULL OR expires_at>?) ORDER BY expires_at DESC LIMIT 10'
        )
        .bind(user.id, nowSec)
        .all()
    ).results as Array<Record<string, unknown>>;
    deliveries.push(...rows.map((row) => toDeliveryDto(row, null)));
  }
  deliveries.sort((a, b) => String(b.expiresAt).localeCompare(String(a.expiresAt)));
  return { deliveries: deliveries.slice(0, 20) };
}

/** ─── GET /courier/me/deliveries — entregas pendientes del mensajero ─────── */
export async function courierDeliveries(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');

  const rows = (
    await shard.db
      .prepare(
        'SELECT * FROM delivery_verifications WHERE courier_id=? ORDER BY expires_at DESC LIMIT 30'
      )
      .bind(user.id)
      .all()
  ).results as Array<Record<string, unknown>>;

  const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
  const names = new Map<string, string>();
  if (clientIds.length > 0) {
    const accs = await env.D1_CORE
      .prepare(`SELECT user_id, full_name FROM account_profiles WHERE user_id IN (${clientIds.map(() => '?').join(',')})`)
      .bind(...clientIds)
      .all();
    for (const a of (accs.results ?? []) as Array<{ user_id: string; full_name: string }>) names.set(a.user_id, a.full_name);
  }
  return { deliveries: rows.map((r) => toDeliveryDto(r, names.get(r.client_id as string) ?? 'Cliente')) };
}

/** Acredita una entrega con su código. Lo usan el flujo antiguo (OTP) y el chat. */
export async function confirmVerification(
  env: V2Env,
  courier: { id: string; fullName: string },
  db: D1Database,
  row: Record<string, unknown>,
  code: string,
): Promise<number> {
  const deliveryId = row.id as string;
  if (row.confirmed_at) throw new HttpError(409, 'Esta entrega ya está verificada.');
  if (row.cancelled_at) throw new HttpError(409, 'Este código fue cancelado.');
  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    throw new HttpError(429, 'Demasiados intentos. Pide al cliente un código nuevo.');
  }
  const nowSec = Math.floor(nowMs() / 1000);
  if ((row.expires_at as number) <= nowSec) throw new HttpError(410, 'El código venció. Pide al cliente uno nuevo.');

  const actual = await hashCode(deliveryId, code);
  if (actual !== (row.code_hash as string)) {
    await db.prepare('UPDATE delivery_verifications SET attempts=attempts+1 WHERE id=?').bind(deliveryId).run();
    throw new HttpError(400, 'Código incorrecto.');
  }

  const agg = await db
    .prepare(
      `UPDATE courier_profiles SET verified_deliveries=verified_deliveries+1, version=version+1, updated_at=unixepoch()
       WHERE user_id=? RETURNING verified_deliveries`
    )
    .bind(courier.id)
    .first<{ verified_deliveries: number }>();
  await db.batch([
    db.prepare('UPDATE delivery_verifications SET confirmed_at=? WHERE id=?').bind(nowSec, deliveryId),
    db
      .prepare(
        `INSERT OR IGNORE INTO shard_outbox(id,user_id,version)
         SELECT 'profile:'||user_id||':'||version, user_id, version FROM courier_profiles WHERE user_id=?`
      )
      .bind(courier.id),
  ]);
  await syncProjection(env, courier.id).catch(() => null);
  await env.D1_CORE
    .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'entrega','Entrega verificada',?)")
    .bind(newId(), row.client_id as string, `${courier.fullName} verificó tu entrega con el código. ¡Gracias por confirmar tu recepción!`)
    .run();
  return agg?.verified_deliveries ?? 0;
}

/** ─── POST /courier/me/deliveries/:id/verify — el mensajero acredita con el código (flujo antiguo) ── */
export async function verifyDelivery(request: Request, env: V2Env, deliveryId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `verify:${user.id}`, 30, 60_000);
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');

  const code = (asString(body.code) ?? '').trim();
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'El código tiene 6 dígitos.');

  const row = await shard.db
    .prepare('SELECT * FROM delivery_verifications WHERE id=? AND courier_id=? LIMIT 1')
    .bind(deliveryId, user.id)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Entrega no encontrada.');

  const verifiedDeliveries = await confirmVerification(env, user, shard.db, row, code);
  return { ok: true, verifiedDeliveries };
}

/** Enlaza una reseña con una entrega verificada (usa passport.submitReview). */
export async function verifiedDeliveryFor(
  db: D1Database,
  courierId: string,
  authorId: string,
  deliveryId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT id FROM delivery_verifications WHERE id=? AND courier_id=? AND client_id=? AND confirmed_at IS NOT NULL LIMIT 1')
    .bind(deliveryId, courierId, authorId)
    .first<{ id: string }>();
  return row?.id ?? null;
}
