// MENRUT v2 — GET /admin/system: resumen de tablas globales, shards y estado
// de la reconciliación programada (última corrida real de reconciliation_runs).
import { requireRole, type V2Env } from './core';
import { requireAuth } from './identity';
import { lastReconciliation } from './reconcile';

export async function adminSystem(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const scalar = async (sql: string): Promise<number> => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;
  let databaseOk = true;
  let territories = 0;
  let couriers = 0;
  let users = 0;
  let conversations = 0;
  let notifications = 0;
  let auditEvents = 0;
  let demoCouriers = 0;
  try {
    [
      territories,
      couriers,
      users,
      conversations,
      notifications,
      auditEvents,
      demoCouriers,
    ] = await Promise.all([
      scalar('SELECT COUNT(*) AS n FROM Municipality'),
      scalar('SELECT COUNT(*) AS n FROM courier_shard_map'),
      scalar('SELECT COUNT(*) AS n FROM global_accounts'),
      scalar('SELECT COUNT(*) AS n FROM conversations'),
      scalar('SELECT COUNT(*) AS n FROM notifications'),
      scalar('SELECT COUNT(*) AS n FROM audit_events'),
      scalar('SELECT COUNT(*) AS n FROM public_courier_directory WHERE is_demo=1'),
    ]);
  } catch {
    databaseOk = false;
  }

  const demoShare = couriers > 0 ? Math.round((demoCouriers / couriers) * 1000) / 10 : 0;
  let reconciliation: Record<string, unknown> | null = null;
  try {
    reconciliation = await lastReconciliation(env);
  } catch {
    reconciliation = null;
  }
  return { databaseOk, territories, couriers, users, routes: 0, conversations, notifications, auditEvents, demoShare, reconciliation };
}
