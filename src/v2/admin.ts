// MENRUT v2 — Panel de administración (1/4): métricas, mensajeros,
// verificaciones de identidad y cuentas globales.
import {
  asString,
  audit,
  HttpError,
  newId,
  nowMs,
  requireRole,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { loadAccount } from './identity';
import { assignedShard, bumpProfileVersion, syncProjection } from './shard';
import { activeMembership, SECONDS_PER_CREDIT } from './wallet';

/** Ejecuta una consulta COUNT en cada shard habilitado y suma/agrupa. */
export async function fanoutCounts(
  env: V2Env,
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  const registry = await env.D1_CORE.prepare('SELECT shard_id FROM shard_registry WHERE enabled=1').all();
  const rows: Array<Record<string, unknown>> = [];
  for (const r of ((registry.results ?? []) as Array<{ shard_id: number }>)) {
    const binding = `D1_SHARD_${String(r.shard_id).padStart(2, '0')}` as const;
    const db = env[binding];
    if (!db) continue;
    try {
      const res = await db.prepare(sql).all();
      for (const row of (res.results ?? []) as Array<Record<string, unknown>>) {
        rows.push({ ...row, shardId: r.shard_id });
      }
    } catch {
      /* shard caído: se omite en el agregado */
    }
  }
  return rows;
}

async function count(env: V2Env, sql: string, ...params: unknown[]): Promise<number> {
  const row = await env.D1_CORE.prepare(sql).bind(...params).first<{ n: number }>();
  return row?.n ?? 0;
}

// ─── GET /admin/overview ────────────────────────────────────────────────────
export async function adminOverview(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');

  const now = nowMs();
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime() / 1000;

  const [
    couriersTotal,
    couriersVerified,
    couriersPending,
    couriersHidden,
    clientsTotal,
    paymentsPending,
    paymentsApprovedThisMonth,
    demoCouriers,
  ] = await Promise.all([
    count(env, 'SELECT COUNT(*) AS n FROM courier_shard_map'),
    count(env, 'SELECT COUNT(*) AS n FROM public_courier_directory WHERE is_verified=1'),
    count(env, "SELECT COUNT(*) AS n FROM courier_verifications WHERE status='pending'"),
    count(env, 'SELECT COUNT(*) AS n FROM public_courier_directory WHERE visible=0'),
    count(env, "SELECT COUNT(DISTINCT user_id) AS n FROM user_roles WHERE role IN ('client','business')"),
    count(env, "SELECT COUNT(*) AS n FROM payment_proofs WHERE status='pending'"),
    count(env, "SELECT COUNT(*) AS n FROM payment_proofs WHERE status IN ('approved','credited') AND reviewed_at>=?", Math.floor(monthStart)),
    count(env, 'SELECT COUNT(*) AS n FROM public_courier_directory WHERE is_demo=1'),
  ]);

  const routeRows = await fanoutCounts(env, "SELECT status, COUNT(*) AS n FROM courier_routes GROUP BY status");
  const routesBy = (status: string) =>
    routeRows.filter((r) => r.status === status).reduce((acc, r) => acc + (r.n as number), 0);
  const reportRows = await fanoutCounts(env, "SELECT COUNT(*) AS n FROM report_flags WHERE status='open'");
  const reportsOpen = reportRows.reduce((acc, r) => acc + (r.n as number), 0);

  return {
    couriers: { total: couriersTotal, verified: couriersVerified, pending: couriersPending, hidden: couriersHidden },
    clients: { total: clientsTotal },
    routes: { active: routesBy('active'), scheduled: routesBy('scheduled') },
    payments: { pending: paymentsPending, approvedThisMonth: paymentsApprovedThisMonth },
    reports: { open: reportsOpen },
    demoCouriers,
  };
}

// ─── GET /admin/couriers?status= ────────────────────────────────────────────
export async function adminCouriers(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const status = asString(url.searchParams.get('status'))?.trim() ?? '';
  let where = '1=1';
  const params: unknown[] = [];
  if (status === 'hidden') where = 'd.visible=0';
  else if (status === 'demo') where = 'd.is_demo=1';
  else if (['verified', 'pending', 'unverified', 'rejected'].includes(status)) {
    if (status === 'verified') where = 'd.is_verified=1';
    else if (status === 'unverified') where = 'd.is_verified=0';
    else where = 'EXISTS(SELECT 1 FROM courier_verifications v WHERE v.courier_id=d.user_id AND v.status=?)';
    if (status === 'pending' || status === 'rejected') params.push(status);
  }

  const rows = await db
    .prepare(
      `SELECT d.*, p.email, p.avatar_path AS avatarUrl, m.shard_id AS shardId, m.assigned_at AS assignedAt
       FROM public_courier_directory d
       JOIN courier_shard_map m ON m.user_id=d.user_id
       LEFT JOIN account_profiles p ON p.user_id=d.user_id
       WHERE ${where} ORDER BY m.assigned_at DESC LIMIT 100`
    )
    .bind(...params)
    .all();

  const routeCounts = await fanoutCounts(env, 'SELECT user_id, COUNT(*) AS n FROM courier_routes GROUP BY user_id');
  const routesByCourier = new Map(routeCounts.map((r) => [r.user_id as string, r.n as number]));

  const couriers: Array<Record<string, unknown>> = [];
  for (const d of (rows.results ?? []) as Array<Record<string, unknown>>) {
    const uid = d.user_id as string;
    const shard = await assignedShard(env, uid);
    let planName: string | null = null;
    let planExpiresAt: string | null = null;
    let permanenceCredits = 0;
    if (shard) {
      const wallet = await shard.db
        .prepare('SELECT permanence_seconds, expires_at, plan_id FROM credit_wallets WHERE user_id=?')
        .bind(uid)
        .first<{ permanence_seconds: number; expires_at: number; plan_id: string }>();
      if (wallet) {
        const remaining = Math.max(0, wallet.permanence_seconds - Math.max(0, Math.floor(nowMs() / 1000) - 0));
        permanenceCredits = Math.round(remaining / SECONDS_PER_CREDIT);
        if (wallet.expires_at > Math.floor(nowMs() / 1000) && wallet.permanence_seconds > 0) {
          const plan = await activeMembership(env, uid);
          planName = plan?.planName ?? null;
          planExpiresAt = plan ? new Date(plan.expiresAtMs).toISOString() : null;
        }
      }
    }
    couriers.push({
      courierId: uid,
      userId: uid,
      fullName: d.name,
      email: d.email ?? '',
      avatarUrl: d.avatarUrl,
      verificationStatus: d.is_verified === 1 ? 'verified' : 'unverified',
      isPublic: d.visible === 1,
      ratingAvg: (d.review_count as number) > 0 ? (d.rating_sum as number) / (d.review_count as number) : 0,
      ratingCount: d.review_count,
      routesCount: routesByCourier.get(uid) ?? 0,
      planName,
      planExpiresAt,
      permanenceCredits,
      createdAt: new Date((d.assignedAt as number) * 1000).toISOString(),
      isDemo: d.is_demo === 1,
      shardId: d.shardId,
    });
  }
  return { couriers };
}

// ─── PATCH /admin/couriers/:courierId/verification ──────────────────────────
export async function adminReviewVerification(
  request: Request,
  env: V2Env,
  courierId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const decision = asString(body.decision) ?? '';
  const note = asString(body.note)?.trim() ?? '';
  if (decision !== 'verified' && decision !== 'rejected') throw new HttpError(400, 'Decisión no válida.');
  if (!note) throw new HttpError(400, 'La nota de revisión es obligatoria.');

  const courier = await loadAccount(env, courierId);
  if (!courier) throw new HttpError(404, 'Mensajero no encontrado.');

  const nowSec = Math.floor(nowMs() / 1000);
  const pending = await db
    .prepare("SELECT id FROM courier_verifications WHERE courier_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1")
    .bind(courierId)
    .first<{ id: string }>();

  const stmts: D1PreparedStatement[] = [
    db
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,?, 'Verificación revisada',?)")
      .bind(
        newId(),
        courierId,
        'admin',
        decision === 'verified'
          ? `Tu identidad fue verificada por MENRUT. ${note}`
          : `Tu solicitud de verificación fue rechazada. ${note}`,
      ),
  ];
  if (pending) {
    stmts.push(
      db
        .prepare('UPDATE courier_verifications SET status=?, reviewed_by=?, review_note=?, reviewed_at=? WHERE id=?')
        .bind(decision === 'verified' ? 'approved' : 'rejected', user.id, note, nowSec, pending.id),
    );
  }
  await db.batch(stmts);

  // Estado de verificación en el shard dueño + proyección.
  const shard = await assignedShard(env, courierId);
  if (shard) {
    await shard.db
      .prepare('UPDATE courier_profiles SET verification_status=?, updated_at=unixepoch() WHERE user_id=?')
      .bind(decision, courierId)
      .run();
    await bumpProfileVersion(env, courierId);
    await syncProjection(env, courierId).catch(() => null);
  }

  await audit(env, user.id, `courier.verification.${decision}`, 'courier_verifications', courierId, `Mensajero: ${courier.fullName}. Nota: ${note}`);
  return { ok: true };
}

// ─── GET /admin/accounts ────────────────────────────────────────────────────
export async function adminAccounts(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const users = await db
    .prepare(
      `SELECT a.user_id, a.status, a.created_at, p.email, p.full_name,
       (SELECT GROUP_CONCAT(role) FROM user_roles r WHERE r.user_id=a.user_id) AS roles
       FROM global_accounts a LEFT JOIN account_profiles p ON p.user_id=a.user_id
       ORDER BY a.created_at DESC LIMIT 200`
    )
    .all();
  const reportRows = await fanoutCounts(env, 'SELECT reporter_id, COUNT(*) AS n FROM report_flags GROUP BY reporter_id');
  const reportsByUser = new Map(reportRows.map((r) => [r.reporter_id as string, r.n as number]));

  return {
    accounts: ((users.results ?? []) as Array<Record<string, unknown>>).map((u) => ({
      id: u.user_id,
      fullName: u.full_name ?? 'Cuenta MENRUT',
      email: u.email ?? '',
      role: (u.roles as string | null)?.split(',')[0] ?? 'client',
      status: u.status,
      createdAt: new Date((u.created_at as number) * 1000).toISOString(),
      reportsCount: reportsByUser.get(u.user_id as string) ?? 0,
    })),
  };
}
