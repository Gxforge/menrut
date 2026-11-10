// MENRUT v2 — Reconciliación general PROGRAMADA (antes perezosa: solo sync y
// decisiones de pago). Dos motores:
//   1) Auto-disparo por tráfico: cada request comprueba (barato) si pasaron
//      6 h desde la última corrida y lanza la reconciliación en waitUntil.
//      INSERT OR IGNORE con id de ventana = guarda anti-estampida.
//   2) Cron externo: POST /cron/reconcile con X-Cron-Secret (worker
//      menrut-reconciler cada 6 h; ver workers/reconciler).
// Qué hace: procesa outbox pendiente de TODOS los shards, libera reservas de
// herramientas vencidas (devolviendo créditos) y repara descuentos huérfanos.
import { HttpError, newId, nowMs, type V2Env } from './core';
import { syncProjection } from './shard';
import { releaseExpiredReservations, repairOrphanToolLedger } from './tools-effects';

const WINDOW_SEC = 6 * 3600; // cada 6 horas.
const PER_SHARD_LIMIT = 40; // usuarios outbox por corrida y shard.

interface RunSummary {
  pendingBefore: number;
  synced: number;
  reservationsReleased: number;
  orphansRepaired: number;
  detail: string;
}

/** Corrida completa: todos los shards habilitados. Idempotente y acotada. */
export async function runReconciliation(env: V2Env, runId: string): Promise<RunSummary> {
  const startedAt = Math.floor(nowMs() / 1000);
  await env.D1_CORE
    .prepare('INSERT OR IGNORE INTO reconciliation_runs(id,started_at) VALUES(?,?)')
    .bind(runId, startedAt)
    .run();

  const summary: RunSummary = { pendingBefore: 0, synced: 0, reservationsReleased: 0, orphansRepaired: 0, detail: '' };
  const problems: string[] = [];
  const registry = await env.D1_CORE.prepare('SELECT shard_id FROM shard_registry WHERE enabled=1 ORDER BY shard_id').all();

  for (const r of ((registry.results ?? []) as Array<{ shard_id: number }>)) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) {
      problems.push(`shard-${r.shard_id}:sin-binding`);
      continue;
    }
    try {
      summary.reservationsReleased += await releaseExpiredReservations(db);
      summary.orphansRepaired += await repairOrphanToolLedger(db);

      const pending = (
        await db
          .prepare('SELECT DISTINCT user_id FROM shard_outbox WHERE processed_at IS NULL LIMIT ?')
          .bind(PER_SHARD_LIMIT)
          .all()
      ).results as Array<{ user_id: string }>;
      summary.pendingBefore += pending.length;
      for (const p of pending) {
        try {
          await syncProjection(env, p.user_id);
          summary.synced += 1;
        } catch {
          problems.push(`shard-${r.shard_id}:sync:${p.user_id.slice(0, 6)}`);
        }
      }
    } catch (e) {
      problems.push(`shard-${r.shard_id}:${e instanceof Error ? e.message.slice(0, 40) : 'error'}`);
    }
  }

  const ok = problems.length === 0 ? 1 : 0;
  summary.detail = problems.slice(0, 5).join(' | ') || 'sin incidencias';
  await env.D1_CORE
    .prepare(
      'UPDATE reconciliation_runs SET finished_at=?, pending_before=?, synced=?, reservations_released=?, orphans_repaired=?, ok=?, detail=? WHERE id=?'
    )
    .bind(Math.floor(nowMs() / 1000), summary.pendingBefore, summary.synced, summary.reservationsReleased, summary.orphansRepaired, ok, summary.detail, runId)
    .run();
  return summary;
}

/** Auto-disparo por tráfico: barato; lanza la corrida si toca (waitUntil). */
export async function maybeStartScheduled(env: V2Env): Promise<void> {
  try {
    const last = await env.D1_CORE
      .prepare('SELECT started_at FROM reconciliation_runs ORDER BY started_at DESC LIMIT 1')
      .first<{ started_at: number }>();
    const nowSec = Math.floor(nowMs() / 1000);
    if (last && nowSec - last.started_at < WINDOW_SEC) return;
    const windowId = `auto:${Math.floor(nowSec / WINDOW_SEC)}`;
    const inserted = await env.D1_CORE
      .prepare('INSERT OR IGNORE INTO reconciliation_runs(id,started_at) VALUES(?,?)')
      .bind(windowId, nowSec)
      .run();
    if ((inserted.meta?.changes ?? 0) === 0) return; // otra request la tomó.
    await runReconciliation(env, windowId);
  } catch {
    /* la reconciliación nunca rompe una request de usuario */
  }
}

/** POST /cron/reconcile — secreto compartido con el worker programado. */
export async function cronReconcile(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const secret = request.headers.get('x-cron-secret') ?? '';
  if (!env.CRON_SECRET || secret.length !== env.CRON_SECRET.length || secret !== env.CRON_SECRET) {
    throw new HttpError(401, 'No autorizado.');
  }
  const summary = await runReconciliation(env, `cron:${newId()}`);
  return { ok: true, ...summary };
}

/** Última corrida (para /admin/system). */
export async function lastReconciliation(env: V2Env): Promise<Record<string, unknown> | null> {
  const row = await env.D1_CORE
    .prepare('SELECT * FROM reconciliation_runs ORDER BY started_at DESC LIMIT 1')
    .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: row.id,
    startedAt: new Date((row.started_at as number) * 1000).toISOString(),
    finishedAt: row.finished_at ? new Date((row.finished_at as number) * 1000).toISOString() : null,
    pendingBefore: row.pending_before,
    synced: row.synced,
    reservationsReleased: row.reservations_released,
    orphansRepaired: row.orphans_repaired,
    ok: row.ok === 1,
    detail: row.detail,
  };
}
