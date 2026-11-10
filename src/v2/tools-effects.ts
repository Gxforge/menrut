// MENRUT v2 — Efectos y mantenimiento de las reservas de herramientas:
// · applyToolEffect: destacado temporal (proyección) o aviso de recorrido a
//   clientes con rutas guardadas coincidentes.
// · releaseExpiredReservations: libera (devuelve el crédito) reservas vencidas.
// · repairOrphanToolLedger: repara descuentos sin reserva (ventana de caída).
import { HttpError, newId, nowMs, type V2Env } from './core';
import { assignedShard, bumpProfileVersion, syncProjection } from './shard';

const HIGHLIGHT_DAYS = 7;

/** Efectos de confirmar el uso de una herramienta. Devuelve un resumen. */
export async function applyToolEffect(env: V2Env, uid: string, toolCode: string): Promise<Record<string, unknown>> {
  if (toolCode.startsWith('destacar') || toolCode.startsWith('destacado') || toolCode.startsWith('prioridad')) {
    const shard = await assignedShard(env, uid);
    if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');
    const until = Math.floor(nowMs() / 1000) + HIGHLIGHT_DAYS * 86400;
    await shard.db
      .prepare('UPDATE courier_profiles SET highlighted_until=MAX(highlighted_until,?) WHERE user_id=?')
      .bind(until, uid)
      .run();
    await bumpProfileVersion(env, uid);
    await syncProjection(env, uid).catch(() => null);
    return { type: 'highlight', until: until * 1000, days: HIGHLIGHT_DAYS };
  }
  if (toolCode.startsWith('anuncio')) {
    const notified = await routeAlertNotifications(env, uid);
    return { type: 'route-alert', notified };
  }
  return { type: 'none', detail: 'Herramienta registrada sin efecto automático.' };
}

/** Notifica a clientes con rutas guardadas que toquen las rutas del mensajero. */
async function routeAlertNotifications(env: V2Env, uid: string): Promise<number> {
  const shard = await assignedShard(env, uid);
  if (!shard) return 0;
  const routes = (
    await shard.db
      .prepare(
        `SELECT origin_id, destination_id, origin_province_id, destination_province_id
         FROM courier_routes WHERE user_id=? AND status IN ('active','scheduled') LIMIT 20`
      )
      .bind(uid)
      .all()
  ).results as Array<Record<string, string | null>>;

  const ids = new Set<string>();
  for (const r of routes) {
    for (const key of ['origin_id', 'destination_id', 'origin_province_id', 'destination_province_id']) {
      const v = r[key];
      if (v) ids.add(v);
    }
  }
  if (ids.size === 0) return 0;
  const placeholders = [...ids].map(() => '?').join(',');
  const saved = await env.D1_CORE
    .prepare(
      `SELECT DISTINCT user_id, label FROM saved_routes WHERE alerts_enabled=1 AND
       (origin_municipality_id IN (${placeholders}) OR destination_municipality_id IN (${placeholders})) LIMIT 100`
    )
    .bind(...ids, ...ids)
    .all();
  const rows = (saved.results ?? []) as Array<{ user_id: string; label: string }>;

  const name = await env.D1_CORE
    .prepare('SELECT full_name FROM account_profiles WHERE user_id=?')
    .bind(uid)
    .first<{ full_name: string }>();
  const courierName = name?.full_name ?? 'Un mensajero';
  const stmts = rows.map((s) =>
    env.D1_CORE
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'ruta','Recorrido anunciado',?)")
      .bind(newId(), s.user_id, `${courierName} anunció un recorrido que toca tu ruta guardada${s.label ? ` (${s.label})` : ''}.`),
  );
  if (stmts.length > 0) {
    for (let i = 0; i < stmts.length; i += 50) {
      await env.D1_CORE.batch(stmts.slice(i, i + 50));
    }
  }
  return rows.length;
}

/** Libera reservas vencidas devolviendo el crédito. Devuelve cuántas. */
export async function releaseExpiredReservations(db: D1Database): Promise<number> {
  const nowSec = Math.floor(nowMs() / 1000);
  const pending = (
    await db
      .prepare("SELECT id, user_id, credit_cost, operation_id FROM tool_reservations WHERE status='reserved' AND expires_at<=? LIMIT 100")
      .bind(nowSec)
      .all()
  ).results as Array<{ id: string; user_id: string; credit_cost: number; operation_id: string }>;
  let released = 0;
  for (const r of pending) {
    const updated = await db
      .prepare("UPDATE tool_reservations SET status='released', released_at=? WHERE id=? AND status='reserved'")
      .bind(nowSec, r.id)
      .run();
    if ((updated.meta?.changes ?? 0) === 0) continue;
    const wallet = await db.prepare('SELECT tool_credits AS c FROM credit_wallets WHERE user_id=?').bind(r.user_id).first<{ c: number }>();
    await db.batch([
      db.prepare('UPDATE credit_wallets SET tool_credits=tool_credits+? WHERE user_id=?').bind(r.credit_cost, r.user_id),
      db
        .prepare('INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,?)')
        .bind(newId(), r.user_id, 'tools', r.credit_cost, (wallet?.c ?? 0) + r.credit_cost, `tool-release:${r.operation_id}`),
    ]);
    released += 1;
  }
  return released;
}

/** Repara descuentos de la ventana de caída (ledger sin reserva): reembolso. */
export async function repairOrphanToolLedger(db: D1Database): Promise<number> {
  const orphans = (
    await db
      .prepare(
        `SELECT l.id AS ledger_id, l.user_id, l.delta, l.operation_id
         FROM credit_ledger l
         WHERE l.wallet='tools' AND l.delta<0 AND l.operation_id LIKE 'tool:%'
           AND NOT EXISTS(SELECT 1 FROM tool_reservations r WHERE r.operation_id=l.operation_id)
           AND NOT EXISTS(SELECT 1 FROM credit_ledger x WHERE x.operation_id='tool-release:'||l.operation_id)
         LIMIT 20`
      )
      .all()
  ).results as Array<{ ledger_id: string; user_id: string; delta: number; operation_id: string }>;
  let repaired = 0;
  for (const o of orphans) {
    const refund = -o.delta;
    const wallet = await db.prepare('SELECT tool_credits AS c FROM credit_wallets WHERE user_id=?').bind(o.user_id).first<{ c: number }>();
    await db.batch([
      db.prepare('UPDATE credit_wallets SET tool_credits=tool_credits+? WHERE user_id=?').bind(refund, o.user_id),
      db
        .prepare('INSERT OR IGNORE INTO credit_ledger(id,user_id,wallet,delta,balance_after,operation_id) VALUES(?,?,?,?,?,?)')
        .bind(newId(), o.user_id, 'tools', refund, (wallet?.c ?? 0) + refund, `tool-release:${o.operation_id}`),
    ]);
    repaired += 1;
  }
  return repaired;
}
