// MENRUT v2 — Carteras del mensajero en su SHARD, en SEGUNDOS (1 crédito =
// 8640 s, igual que v1). Puerta única para asentar y acreditar: toda escritura
// va en batch atómico del shard con ledger e idempotencia por operation_id.
import { HttpError, newId, nowMs, type V2Env } from './core';
import { assignedShard } from './shard';

export const SECONDS_PER_CREDIT = 8640; // 10 créditos = 24 h exactas.
export const DAY_SECONDS = 86400;

export interface ShardWallet {
  user_id: string;
  permanence_seconds: number;
  tool_credits: number;
  settled_at: number;
  expires_at: number;
  plan_id: string;
}

/** Liquida el tiempo transcurrido (una sola sentencia: sin doble cargo). */
export async function settle(db: D1Database, uid: string, nowSec: number): Promise<ShardWallet | null> {
  await db
    .prepare(
      `UPDATE credit_wallets SET
       permanence_seconds=MAX(0,permanence_seconds-MAX(0,?-settled_at)),
       settled_at=MAX(settled_at,?) WHERE user_id=?`
    )
    .bind(nowSec, nowSec, uid)
    .run();
  return db.prepare('SELECT * FROM credit_wallets WHERE user_id=?').bind(uid).first<ShardWallet>();
}

export async function getWallet(env: V2Env, uid: string): Promise<ShardWallet | null> {
  const shard = await assignedShard(env, uid);
  if (!shard) return null;
  return settle(shard.db, uid, Math.floor(nowMs() / 1000));
}

/**
 * Acredita permanencia y herramientas en el shard del mensajero de forma
 * IDEMPOTENTE: operation_id único por pago (restricción UNIQUE del ledger) +
// registro en processed_events. Renovación acumulativa: se conserva el
 * intervalo parcial vigente (settle primero) y la vigencia efectiva se
 * recalcula desde ahora. Devuelve la nueva vigencia (segundos unix) o null
 * si ya estaba acreditada (reintento).
 */
export async function creditGrant(
  env: V2Env,
  uid: string,
  op: { operationId: string; planId: string; permanenceCredits: number; toolCredits: number },
): Promise<{ expiresAt: number } | null> {
  const shard = await assignedShard(env, uid);
  if (!shard) throw new HttpError(409, 'El mensajero no tiene shard asignado.');
  const db = shard.db;
  const nowSec = Math.floor(nowMs() / 1000);

  // Idempotencia dura: si el evento ya se procesó, no se acredita dos veces.
  const done = await db.prepare('SELECT 1 AS ok FROM processed_events WHERE id=?').bind(op.operationId).first();
  if (done) return null;

  const wallet = await settle(db, uid, nowSec);
  if (!wallet) throw new HttpError(409, 'El mensajero no tiene cartera en su shard.');

  const grantedSeconds = op.permanenceCredits * SECONDS_PER_CREDIT;
  const newPermanence = wallet.permanence_seconds + grantedSeconds;
  const newTools = wallet.tool_credits + op.toolCredits;
  const newExpires = nowSec + newPermanence;

  await db.batch([
    db
      .prepare(
        `UPDATE credit_wallets SET permanence_seconds=?, tool_credits=?, plan_id=?, expires_at=?
         WHERE user_id=?`
      )
      .bind(newPermanence, newTools, op.planId, newExpires, uid),
    db
      .prepare(`INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id)
        VALUES(?,?,?,?,?,?)`)
      .bind(newId(), uid, 'permanence', grantedSeconds, newPermanence, op.operationId),
    db
      .prepare(`INSERT INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id)
        VALUES(?,?,?,?,?,?)`)
      .bind(newId(), uid, 'tools', op.toolCredits, newTools, op.operationId),
    db.prepare('INSERT OR IGNORE INTO processed_events(id) VALUES(?)').bind(op.operationId),
    db
      .prepare('UPDATE courier_profiles SET version=version+1, updated_at=unixepoch() WHERE user_id=?')
      .bind(uid),
    db
      .prepare(
        `INSERT OR IGNORE INTO shard_outbox(id,user_id,version)
         SELECT 'profile:'||user_id||':'||version, user_id, version FROM courier_profiles WHERE user_id=?`
      )
      .bind(uid),
  ]);
  return { expiresAt: newExpires };
}

/** Activa la prueba gratuita (una sola vez por cuenta) en el shard. */
export async function activateTrial(
  env: V2Env,
  uid: string,
): Promise<{ planName: string; durationDays: number; permanenceCredits: number } | null> {
  const db = env.D1_CORE;
  const shard = await assignedShard(env, uid);
  if (!shard) throw new HttpError(409, 'El mensajero no tiene shard asignado.');

  // Plan de prueba del catálogo (MembershipPlan, precios aprobados).
  const plan = await db
    .prepare('SELECT id, code, name, durationDays, permanenceCredits FROM MembershipPlan WHERE isTrial=1 ORDER BY sortOrder ASC LIMIT 1')
    .first<{ id: string; code: string; name: string; durationDays: number; permanenceCredits: number }>();
  if (!plan) return null;

  // Registro global de pruebas concedidas (trial_claims), idempotente.
  const claimId = env.TRIAL_HMAC_SECRET ? `hmac:${uid}` : `user:${uid}`;
  const insert = await db
    .prepare('INSERT OR IGNORE INTO trial_claims(identity_hash,user_id) VALUES(?,?)')
    .bind(claimId, uid)
    .run();
  const already = (insert.meta?.changes ?? 0) === 0;
  if (already) return null;

  const granted = await creditGrant(env, uid, {
    operationId: `trial:${uid}`,
    planId: plan.id,
    permanenceCredits: plan.permanenceCredits,
    toolCredits: 0,
  });
  if (!granted) return null; // ya acreditada antes (reintento): no duplica.
  return { planName: plan.name, durationDays: plan.durationDays, permanenceCredits: plan.permanenceCredits };
}

/** Historial del ledger en el contrato del frontend (créditos legibles). */
export async function ledgerTransactions(env: V2Env, uid: string): Promise<
  Array<{ id: string; walletType: string; reason: string; reference: string | null; delta: number; balanceAfter: number; createdAt: number }>
> {
  const shard = await assignedShard(env, uid);
  if (!shard) return [];
  const rows = await shard.db
    .prepare('SELECT * FROM credit_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 20')
    .bind(uid)
    .all();
  return ((rows.results ?? []) as Array<Record<string, unknown>>).map((r) => {
    const wallet = r.wallet as string;
    const isPermanence = wallet === 'permanence';
    const op = String(r.operation_id ?? '');
    let reason = 'Ajuste de cartera';
    if (op.startsWith('payment:')) reason = 'Membresía aprobada';
    else if (op.startsWith('trial:')) reason = 'Prueba gratuita';
    else if (op.startsWith('settle:')) reason = 'Consumo de permanencia';
    else if (op === 'initial') reason = 'Saldo inicial';
    return {
      id: r.id as string,
      walletType: wallet,
      reason,
      reference: op,
      delta: isPermanence ? Math.round(((r.delta as number) / SECONDS_PER_CREDIT) * 10) / 10 : (r.delta as number),
      balanceAfter: isPermanence
        ? Math.round(((r.balance_after as number) / SECONDS_PER_CREDIT) * 10) / 10
        : (r.balance_after as number),
      createdAt: (r.created_at as number) * 1000,
    };
  });
}

/** Membresía vigente (plan del catálogo + vigencia de la cartera del shard). */
export async function activeMembership(
  env: V2Env,
  uid: string,
): Promise<{ planName: string; planCode: string; expiresAtMs: number } | null> {
  const wallet = await getWallet(env, uid);
  const nowSec = Math.floor(nowMs() / 1000);
  if (!wallet || wallet.expires_at <= nowSec || wallet.permanence_seconds <= 0) return null;
  const plan = await env.D1_CORE
    .prepare('SELECT name, code FROM MembershipPlan WHERE id=? LIMIT 1')
    .bind(wallet.plan_id)
    .first<{ name: string; code: string }>();
  return { planName: plan?.name ?? 'Plan', planCode: plan?.code ?? 'basic', expiresAtMs: wallet.expires_at * 1000 };
}
