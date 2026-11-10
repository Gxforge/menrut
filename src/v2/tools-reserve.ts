// MENRUT v2 — Herramientas del mensajero con flujo reserva → confirmación →
// liberación sobre la cartera «tools» (créditos enteros) de SU shard:
// · reserve descuenta y retiene el crédito (TTL 24 h),
// · confirm aplica el efecto (ver tools-effects.ts) y consume la reserva,
// · release (manual o por vencimiento) devuelve el crédito al mensajero.
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
import { assignedShard } from './shard';
import { getWallet, activeMembership } from './wallet';
import { applyToolEffect, releaseExpiredReservations } from './tools-effects';
import type { ToolRow } from './dto';

const RESERVATION_TTL_SEC = 86400; // 24 h para confirmar el uso.

/** Nivel de plan (para minPlanCode de la herramienta). */
export function planRank(code: string | null | undefined): number {
  if (!code) return 0;
  if (code.startsWith('featured')) return 3;
  if (code.startsWith('pro')) return 2;
  if (code.startsWith('basic') || code.startsWith('mensual')) return 1;
  return 0; // pruebas y desconocidos.
}

function eligibility(tool: ToolRow, membership: { planCode: string } | null): { eligible: boolean; reason: string | null } {
  if (!tool.isActive) return { eligible: false, reason: 'Herramienta no disponible temporalmente.' };
  if (tool.requiresActiveMembership && !membership) {
    return { eligible: false, reason: tool.blockedMessage || 'Requiere una membresía activa.' };
  }
  if (tool.minPlanCode && (!membership || planRank(membership.planCode) < planRank(tool.minPlanCode))) {
    return { eligible: false, reason: tool.blockedMessage || 'Requiere un plan superior.' };
  }
  return { eligible: true, reason: null };
}

/** ─── GET /courier/me/tools ──────────────────────────────────────────────── */
export async function listMyTools(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');

  const released = await releaseExpiredReservations(shard.db);
  const wallet = await getWallet(env, user.id);
  const membership = await activeMembership(env, user.id);

  const toolRows = await env.D1_CORE.prepare('SELECT * FROM Tool ORDER BY sortOrder ASC').all();
  const tools = ((toolRows.results ?? []) as unknown as ToolRow[]).map((t) => {
    const e = eligibility(t, membership);
    return {
      id: t.id, code: t.code, name: t.name, description: t.description, tag: t.tag,
      minPlanCode: t.minPlanCode, creditCost: t.creditCost,
      requiresActiveMembership: !!t.requiresActiveMembership,
      isActive: !!t.isActive, blockedMessage: t.blockedMessage,
      eligible: e.eligible, blockedReason: e.reason,
    };
  });

  const resRows = await shard.db
    .prepare('SELECT * FROM tool_reservations WHERE user_id=? ORDER BY created_at DESC LIMIT 30')
    .bind(user.id)
    .all();
  const reservations = ((resRows.results ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id, toolId: r.tool_id, toolCode: r.tool_code, creditCost: r.credit_cost,
    status: r.status, note: r.note,
    createdAt: new Date((r.created_at as number) * 1000).toISOString(),
    expiresAt: new Date((r.expires_at as number) * 1000).toISOString(),
    confirmedAt: r.confirmed_at ? new Date((r.confirmed_at as number) * 1000).toISOString() : null,
    releasedAt: r.released_at ? new Date((r.released_at as number) * 1000).toISOString() : null,
  }));

  const profile = await shard.db
    .prepare('SELECT highlighted_until AS highlightedUntil FROM courier_profiles WHERE user_id=?')
    .bind(user.id)
    .first<{ highlightedUntil: number }>();

  return {
    tools,
    reservations,
    toolCredits: wallet?.tool_credits ?? 0,
    highlightedUntil: profile && profile.highlightedUntil > Math.floor(nowMs() / 1000) ? profile.highlightedUntil * 1000 : null,
    autoReleased: released,
  };
}

/** ─── POST /courier/me/tools/:id/reserve ─────────────────────────────────── */
export async function reserveTool(request: Request, env: V2Env, toolId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `tool:${user.id}`, 20, 60_000);
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');
  const db = shard.db;

  await releaseExpiredReservations(db);
  const tool = await env.D1_CORE.prepare('SELECT * FROM Tool WHERE id=? LIMIT 1').bind(toolId).first<ToolRow>();
  if (!tool) throw new HttpError(404, 'Herramienta no encontrada.');
  const membership = await activeMembership(env, user.id);
  const e = eligibility(tool, membership);
  if (!e.eligible) throw new HttpError(403, e.reason ?? 'No disponible.');

  const wallet = await getWallet(env, user.id);
  const cost = tool.creditCost;
  if ((wallet?.tool_credits ?? 0) < cost) {
    throw new HttpError(400, `Te faltan créditos de herramientas (necesitas ${cost}, tienes ${wallet?.tool_credits ?? 0}).`);
  }
  if (cost === 0) throw new HttpError(400, 'Esta herramienta no consume créditos: está siempre disponible.');

  const note = (asString(body.note) ?? '').trim().slice(0, 200);
  const id = newId();
  const operationId = `tool:${id}`;
  const nowSec = Math.floor(nowMs() / 1000);

  // 1) Descuento condicional (atómico en una sola sentencia).
  const deducted = await db
    .prepare('UPDATE credit_wallets SET tool_credits=tool_credits-? WHERE user_id=? AND tool_credits>=?')
    .bind(cost, user.id, cost)
    .run();
  if ((deducted.meta?.changes ?? 0) === 0) throw new HttpError(400, 'No tienes créditos de herramientas suficientes.');

  // 2) Reserva + asiento del ledger (idempotentes por operation_id único).
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO tool_reservations(id,user_id,tool_id,tool_code,credit_cost,status,operation_id,created_at,expires_at,note)
         VALUES(?,?,?,?,?,'reserved',?,?,?,?)`
      )
      .bind(id, user.id, tool.id, tool.code, cost, operationId, nowSec, nowSec + RESERVATION_TTL_SEC, note),
    db
      .prepare('INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,?)')
      .bind(newId(), user.id, 'tools', -cost, (wallet?.tool_credits ?? 0) - cost, operationId),
  ]);

  return {
    reservation: { id, toolCode: tool.code, creditCost: cost, status: 'reserved', expiresAt: (nowSec + RESERVATION_TTL_SEC) * 1000 },
  };
}

/** ─── POST /courier/me/tools/:id/confirm ─────────────────────────────────── */
export async function confirmToolUse(request: Request, env: V2Env, toolId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');
  const db = shard.db;

  const reservationId = asString(body.reservationId) ?? '';
  if (!reservationId) throw new HttpError(400, 'Falta la reserva a confirmar.');
  await releaseExpiredReservations(db);

  const r = await db
    .prepare('SELECT * FROM tool_reservations WHERE id=? AND user_id=? AND tool_id=? LIMIT 1')
    .bind(reservationId, user.id, toolId)
    .first<Record<string, unknown>>();
  if (!r) throw new HttpError(404, 'Reserva no encontrada.');
  if (r.status !== 'reserved') throw new HttpError(409, `La reserva ya está ${r.status === 'confirmed' ? 'confirmada' : 'liberada'}.`);

  const updated = await db
    .prepare("UPDATE tool_reservations SET status='confirmed', confirmed_at=unixepoch() WHERE id=? AND status='reserved'")
    .bind(reservationId)
    .run();
  if ((updated.meta?.changes ?? 0) === 0) throw new HttpError(409, 'La reserva ya no está activa.');

  const effect = await applyToolEffect(env, user.id, r.tool_code as string);
  return { ok: true, effect };
}

/** ─── POST /courier/me/tools/:id/release ─────────────────────────────────── */
export async function releaseToolReservation(request: Request, env: V2Env, toolId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');
  const db = shard.db;

  const reservationId = asString(body.reservationId) ?? '';
  if (!reservationId) throw new HttpError(400, 'Falta la reserva a liberar.');
  const r = await db
    .prepare('SELECT * FROM tool_reservations WHERE id=? AND user_id=? AND tool_id=? LIMIT 1')
    .bind(reservationId, user.id, toolId)
    .first<Record<string, unknown>>();
  if (!r) throw new HttpError(404, 'Reserva no encontrada.');
  if (r.status !== 'reserved') throw new HttpError(409, 'Solo se pueden liberar reservas activas.');

  const refunded = await refundReservation(db, reservationId, user.id, r.credit_cost as number, r.operation_id as string);
  if (!refunded) throw new HttpError(409, 'La reserva ya no está activa.');
  return { ok: true, toolCredits: (await getWallet(env, user.id))?.tool_credits ?? 0 };
}

/** Devuelve el crédito de una reserva (uso interno; también la usa reconcile). */
export async function refundReservation(
  db: D1Database,
  reservationId: string,
  userId: string,
  cost: number,
  operationId: string,
): Promise<boolean> {
  const nowSec = Math.floor(nowMs() / 1000);
  const updated = await db
    .prepare("UPDATE tool_reservations SET status='released', released_at=? WHERE id=? AND status='reserved'")
    .bind(nowSec, reservationId)
    .run();
  if ((updated.meta?.changes ?? 0) === 0) return false;
  const wallet = await db.prepare('SELECT tool_credits AS c FROM credit_wallets WHERE user_id=?').bind(userId).first<{ c: number }>();
  await db.batch([
    db.prepare('UPDATE credit_wallets SET tool_credits=tool_credits+? WHERE user_id=?').bind(cost, userId),
    db
      .prepare('INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,?)')
      .bind(newId(), userId, 'tools', cost, (wallet?.c ?? 0) + cost, `tool-release:${operationId}`),
  ]);
  return true;
}
