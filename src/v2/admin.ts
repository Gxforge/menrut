// MENRUT v2 — Panel de administración: métricas, mensajeros, verificaciones,
// cuentas, pagos Transfermóvil (con decisión transaccional), planes,
// herramientas, moderación, sistema y configuración.
import {
  asBool,
  asInt,
  asString,
  audit,
  HttpError,
  newId,
  nowMs,
  requireAuth,
  requireRole,
  supabaseSignedUrls,
  type V2Env,
} from './core';
import { ADMIN_PAYMENT_PROOF_SELECT, toPaymentProofDto, toPlanDto, toToolDto, type PaymentProofRow, type PlanRow, type ToolRow } from './dto';
import { getWallet, reconcileWallet } from './wallet';

const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET = 'payment-proofs-private';
const SIGNED_URL_TTL = 600; // 10 minutos

async function count(env: V2Env, sql: string, ...params: unknown[]): Promise<number> {
  const row = await env.D1_CORE.prepare(sql).bind(...params).first<{ n: number }>();
  return row?.n ?? 0;
}

// ─── GET /admin/overview ────────────────────────────────────────────────────
export async function adminOverview(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');

  const now = nowMs();
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();

  const [
    couriersTotal,
    couriersVerified,
    couriersPending,
    couriersHidden,
    clientsTotal,
    routesActive,
    routesScheduled,
    paymentsPending,
    paymentsApprovedThisMonth,
    reportsOpen,
    demoCouriers,
  ] = await Promise.all([
    count(env, 'SELECT COUNT(*) AS n FROM CourierProfile'),
    count(env, "SELECT COUNT(*) AS n FROM CourierProfile WHERE verificationStatus='verified'"),
    count(env, "SELECT COUNT(*) AS n FROM CourierProfile WHERE verificationStatus='pending'"),
    count(env, 'SELECT COUNT(*) AS n FROM CourierProfile WHERE isPublic=0'),
    count(env, "SELECT COUNT(*) AS n FROM User WHERE role IN ('client','business')"),
    count(env, "SELECT COUNT(*) AS n FROM Route WHERE status='active'"),
    count(env, "SELECT COUNT(*) AS n FROM Route WHERE status='scheduled'"),
    count(env, "SELECT COUNT(*) AS n FROM PaymentProof WHERE status='pending'"),
    count(env, 'SELECT COUNT(*) AS n FROM PaymentProof WHERE status=? AND reviewedAt>=?', 'approved', monthStart),
    count(env, "SELECT COUNT(*) AS n FROM ReportFlag WHERE status='open'"),
    count(env, 'SELECT COUNT(*) AS n FROM CourierProfile WHERE isDemo=1'),
  ]);

  return {
    couriers: { total: couriersTotal, verified: couriersVerified, pending: couriersPending, hidden: couriersHidden },
    clients: { total: clientsTotal },
    routes: { active: routesActive, scheduled: routesScheduled },
    payments: { pending: paymentsPending, approvedThisMonth: paymentsApprovedThisMonth },
    reports: { open: reportsOpen },
    demoCouriers,
  };
}

// ─── GET /admin/couriers?status= ────────────────────────────────────────────
export async function adminCouriers(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const status = asString(url.searchParams.get('status'))?.trim() ?? '';
  let where = '1=1';
  const params: unknown[] = [];
  if (status === 'hidden') {
    where = 'p.isPublic=0';
  } else if (status === 'demo') {
    where = 'p.isDemo=1';
  } else if (['verified', 'pending', 'unverified', 'rejected'].includes(status)) {
    where = 'p.verificationStatus=?';
    params.push(status);
  }

  const profiles = await db
    .prepare(
      `SELECT p.id, p.userId, p.verificationStatus, p.isPublic, p.ratingAvg, p.ratingCount, p.isDemo, p.createdAt,
       u.fullName, u.email, u.avatarUrl
       FROM CourierProfile p JOIN User u ON u.id=p.userId
       WHERE ${where} ORDER BY p.createdAt DESC`
    )
    .bind(...params)
    .all();

  const routeCounts = await db.prepare('SELECT courierId, COUNT(*) AS n FROM Route GROUP BY courierId').all();
  const routesByCourier = new Map(
    ((routeCounts.results ?? []) as Array<{ courierId: string; n: number }>).map((r) => [r.courierId, r.n]),
  );

  const couriers: Array<Record<string, unknown>> = [];
  for (const p of (profiles.results ?? []) as Array<Record<string, unknown>>) {
    const membership = await db
      .prepare(
        `SELECT m.expiresAt, mp.name AS planName FROM Membership m JOIN MembershipPlan mp ON mp.id=m.planId
         WHERE m.courierId=? AND m.status='active' ORDER BY m.expiresAt DESC LIMIT 1`
      )
      .bind(p.id as string)
      .first<{ expiresAt: number; planName: string }>();
    const wallet = await getWallet(env, p.id as string);
    couriers.push({
      courierId: p.id,
      userId: p.userId,
      fullName: p.fullName,
      email: p.email,
      avatarUrl: p.avatarUrl,
      verificationStatus: p.verificationStatus,
      isPublic: !!p.isPublic,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      routesCount: routesByCourier.get(p.id as string) ?? 0,
      planName: membership?.planName ?? null,
      planExpiresAt: membership ? new Date(membership.expiresAt).toISOString() : null,
      permanenceCredits: wallet?.permanenceCredits ?? 0,
      createdAt: new Date(p.createdAt as number).toISOString(),
      isDemo: !!p.isDemo,
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
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const decision = asString(body.decision) ?? '';
  const note = asString(body.note)?.trim() ?? '';
  if (decision !== 'verified' && decision !== 'rejected') throw new HttpError(400, 'Decisión no válida.');
  if (!note) throw new HttpError(400, 'La nota de revisión es obligatoria.');

  const profile = await db
    .prepare('SELECT p.id, p.userId, u.fullName FROM CourierProfile p JOIN User u ON u.id=p.userId WHERE p.id=? LIMIT 1')
    .bind(courierId)
    .first<{ id: string; userId: string; fullName: string }>();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  const now = nowMs();
  // Resuelve la solicitud pendiente más reciente (si existe).
  const pending = await db
    .prepare("SELECT id FROM VerificationRequest WHERE courierId=? AND status='pending' ORDER BY createdAt DESC LIMIT 1")
    .bind(courierId)
    .first<{ id: string }>();

  const stmts: D1PreparedStatement[] = [
    db.prepare('UPDATE CourierProfile SET verificationStatus=?, updatedAt=? WHERE id=?').bind(decision, now, courierId),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,?,?,NULL,?)"
      )
      .bind(
        newId(), profile.userId, 'admin',
        decision === 'verified' ? 'Verificación aprobada' : 'Verificación rechazada',
        decision === 'verified'
          ? `Tu identidad fue verificada por MENRUT. ${note}`
          : `Tu solicitud de verificación fue rechazada. ${note}`,
        now,
      ),
  ];
  if (pending) {
    stmts.push(
      db
        .prepare(
          "UPDATE VerificationRequest SET status=?, reviewedBy=?, reviewNote=?, reviewedAt=? WHERE id=?"
        )
        .bind(decision === 'verified' ? 'approved' : 'rejected', user.id, note, now, pending.id),
    );
  }
  await db.batch(stmts);

  await audit(
    env,
    user.id,
    `courier.verification.${decision}`,
    'CourierProfile',
    courierId,
    `Mensajero: ${profile.fullName}. Nota: ${note}`,
  );
  return { ok: true };
}

// ─── GET /admin/accounts ────────────────────────────────────────────────────
export async function adminAccounts(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const users = await db.prepare('SELECT * FROM User ORDER BY createdAt DESC').all();
  const reportCounts = await db.prepare('SELECT reporterId, COUNT(*) AS n FROM ReportFlag GROUP BY reporterId').all();
  const reportsByUser = new Map(
    ((reportCounts.results ?? []) as Array<{ reporterId: string; n: number }>).map((r) => [r.reporterId, r.n]),
  );

  return {
    accounts: ((users.results ?? []) as Array<Record<string, unknown>>).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: new Date(u.createdAt as number).toISOString(),
      reportsCount: reportsByUser.get(u.id as string) ?? 0,
    })),
  };
}

// ─── GET /admin/payments?status= ────────────────────────────────────────────
export async function adminPayments(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const statusParam = asString(url.searchParams.get('status'))?.trim() ?? '';
  const VALID_STATUSES = ['pending', 'approved', 'rejected'];
  const where = statusParam && statusParam !== 'all' && VALID_STATUSES.includes(statusParam) ? 'pp.status=?' : '1=1';
  const params: unknown[] = [];
  if (where !== '1=1') params.push(statusParam);

  const proofs = await db
    .prepare(
      `${ADMIN_PAYMENT_PROOF_SELECT}
       WHERE ${where}
       ORDER BY pp.createdAt DESC`
    )
    .bind(...params)
    .all();

  // URLs firmadas en lote para las rutas internas de comprobante.
  const rows = (proofs.results ?? []) as Array<Record<string, unknown>>;
  const internalPaths = rows
    .map((p) => p.proofUrl as string)
    .filter((p) => p && !p.startsWith('http'));
  const signed = await supabaseSignedUrls(env, BUCKET, [...new Set(internalPaths)], SIGNED_URL_TTL);

  return {
    payments: rows.map((p) => ({
      id: p.id,
      courierName: p.courierName,
      courierEmail: p.courierEmail,
      courierId: p.courierId,
      planName: p.planName ?? null,
      planCode: p.planCode ?? null,
      amountCup: p.amountCup,
      confirmedAmountCup: p.confirmedAmountCup,
      method: p.method,
      reference: p.reference,
      proofUrl: p.proofUrl,
      proofSignedUrl: p.proofUrl
        ? (p.proofUrl as string).startsWith('http')
          ? p.proofUrl // legacy: ya era una URL pública
          : signed.get(p.proofUrl as string) ?? null
        : null,
      hasProof: !!p.proofUrl,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: new Date(p.createdAt as number).toISOString(),
      reviewedAt: p.reviewedAt ? new Date(p.reviewedAt as number).toISOString() : null,
    })),
  };
}

// ─── PATCH /admin/payments/:id (regla 8.5, membresía acumulativa) ───────────
export async function adminReviewPayment(
  request: Request,
  env: V2Env,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const decision = asString(body.decision) ?? '';
  const note = asString(body.note)?.trim() ?? '';
  if (decision !== 'approved' && decision !== 'rejected') throw new HttpError(400, 'Decisión no válida.');
  if (!note) throw new HttpError(400, 'La nota de revisión es obligatoria.');

  const proof = (await db
    .prepare(`${ADMIN_PAYMENT_PROOF_SELECT} WHERE pp.id=? LIMIT 1`)
    .bind(id)
    .first()) as unknown as (PaymentProofRow & { courierName: string; courierEmail: string; courierUserId: string; courierIsPublic: number }) | null;
  if (!proof) throw new HttpError(404, 'Comprobante no encontrado.');
  if (proof.status !== 'pending') throw new HttpError(409, 'Este comprobante ya fue revisado.');

  const now = nowMs();

  if (decision === 'rejected') {
    await db.batch([
      db
        .prepare('UPDATE PaymentProof SET status=?, reviewNote=?, reviewedBy=?, reviewedAt=? WHERE id=?')
        .bind('rejected', note, user.id, now, id),
      db
        .prepare(
          "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Pago rechazado',?,NULL,?)"
        )
        .bind(newId(), proof.courierUserId, 'membresia', `Tu comprobante fue rechazado. ${note}`, now),
    ]);
    await audit(env, user.id, 'payment.rejected', 'PaymentProof', id, `Mensajero: ${proof.courierName}. Nota: ${note}`);
    return { ok: true };
  }

  // ─── Aprobación ───
  if (!proof.planId) {
    throw new HttpError(400, 'El comprobante no tiene un plan asociado; no se puede aprobar.');
  }
  const plan = await db.prepare('SELECT * FROM MembershipPlan WHERE id=? LIMIT 1').bind(proof.planId).first<{
    id: string;
    code: string;
    name: string;
    durationDays: number;
    permanenceCredits: number;
    toolCredits: number;
  }>();
  if (!plan) throw new HttpError(400, 'El plan asociado no existe; no se puede aprobar.');

  // Membresía del courier con este plan: renovación acumulativa (add).
  const existing = await db
    .prepare(
      "SELECT id, expiresAt FROM Membership WHERE courierId=? AND planId=? AND status='active' ORDER BY expiresAt DESC LIMIT 1"
    )
    .bind(proof.courierId, plan.id)
    .first<{ id: string; expiresAt: number }>();
  let expiresAt: number;
  if (existing && existing.expiresAt > now) {
    expiresAt = existing.expiresAt + plan.durationDays * DAY_MS;
  } else {
    expiresAt = now + plan.durationDays * DAY_MS;
  }

  // Carteras separadas (regla 8.1): permanencia y herramientas.
  let wallet = await getWallet(env, proof.courierId);
  const stmts: D1PreparedStatement[] = [];
  if (!wallet) {
    const wid = newId();
    stmts.push(
      db.prepare('INSERT INTO Wallet(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES(?,?,0,0,NULL,?)').bind(wid, proof.courierId, now),
    );
    wallet = { id: wid, courierId: proof.courierId, permanenceCredits: 0, toolCredits: 0, lastConsumedAt: null };
  }
  stmts.push(
    existing
      ? db.prepare("UPDATE Membership SET expiresAt=?, status='active' WHERE id=?").bind(expiresAt, existing.id)
      : db
          .prepare(
            "INSERT INTO Membership(id,courierId,planId,startedAt,expiresAt,status,createdAt) VALUES(?,?,?,?,?,'active',?)"
          )
          .bind(newId(), proof.courierId, plan.id, now, expiresAt, now),
  );
  if (plan.permanenceCredits > 0) {
    const after = wallet.permanenceCredits + plan.permanenceCredits;
    stmts.push(
      db.prepare('UPDATE Wallet SET permanenceCredits=?, updatedAt=? WHERE id=?').bind(after, now, wallet.id),
      db
        .prepare(
          'INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(newId(), wallet.id, 'permanence', user.id, `Membresía ${plan.name}`, proof.reference || null, wallet.permanenceCredits, plan.permanenceCredits, after, now),
    );
  }
  if (plan.toolCredits > 0) {
    const after = wallet.toolCredits + plan.toolCredits;
    stmts.push(
      db.prepare('UPDATE Wallet SET toolCredits=?, updatedAt=? WHERE id=?').bind(after, now, wallet.id),
      db
        .prepare(
          'INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(newId(), wallet.id, 'tools', user.id, `Membresía ${plan.name}`, proof.reference || null, wallet.toolCredits, plan.toolCredits, after, now),
    );
  }
  // Si el perfil estaba oculto por falta de permanencia → volver a público.
  if (!proof.courierIsPublic) {
    stmts.push(
      db.prepare('UPDATE CourierProfile SET isPublic=1, updatedAt=? WHERE id=?').bind(now, proof.courierId),
      db.prepare('UPDATE Wallet SET lastConsumedAt=? WHERE id=?').bind(now, wallet.id),
    );
  }
  stmts.push(
    db.prepare('UPDATE PaymentProof SET status=?, reviewNote=?, reviewedBy=?, reviewedAt=? WHERE id=?').bind('approved', note, user.id, now, id),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Pago aprobado',?,NULL,?)"
      )
      .bind(
        newId(), proof.courierUserId, 'membresia',
        `Tu membresía ${plan.name} fue activada hasta el ${new Date(expiresAt).toLocaleDateString('es-CU')}.`,
        now,
      ),
  );
  await db.batch(stmts);

  await audit(
    env,
    user.id,
    'payment.approved',
    'PaymentProof',
    id,
    `Mensajero: ${proof.courierName}. Plan: ${plan.name} (+${plan.permanenceCredits} permanencia, +${plan.toolCredits} herramientas). Vence: ${new Date(expiresAt).toISOString()}. Nota: ${note}`,
  );
  return { ok: true };
}

// ─── POST /admin/payments/:id/decide (contrato T8, transaccional) ───────────
export async function adminDecidePayment(
  request: Request,
  env: V2Env,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const action = asString(body.action) ?? '';
  if (action !== 'approve' && action !== 'reject') throw new HttpError(400, 'Acción no válida (approve o reject).');

  const reviewNote = asString(body.reviewNote)?.trim() ?? '';
  let confirmedAmountCup: number | null = null;
  if (body.confirmedAmountCup !== undefined && body.confirmedAmountCup !== null) {
    confirmedAmountCup = asInt(body.confirmedAmountCup);
    if (confirmedAmountCup === null || confirmedAmountCup < 0) {
      throw new HttpError(400, 'La cantidad confirmada debe ser un número entero positivo.');
    }
  }

  const proof = (await db
    .prepare(`${ADMIN_PAYMENT_PROOF_SELECT} WHERE pp.id=? LIMIT 1`)
    .bind(id)
    .first()) as unknown as (PaymentProofRow & { courierName: string; courierUserId: string; courierIsPublic: number }) | null;
  if (!proof) throw new HttpError(404, 'Solicitud de pago no encontrada.');
  if (proof.status !== 'pending') throw new HttpError(409, 'Ya fue decidida.');
  if (action === 'reject' && !reviewNote) throw new HttpError(400, 'El motivo del rechazo es obligatorio.');
  if (action === 'approve' && !proof.planId) {
    throw new HttpError(400, 'La solicitud no tiene un plan asociado; no se puede aprobar.');
  }

  const now = nowMs();

  // ─── Rechazo ───
  if (action === 'reject') {
    await db.batch([
      db
        .prepare('UPDATE PaymentProof SET status=?, reviewNote=?, reviewedBy=?, reviewedAt=? WHERE id=?')
        .bind('rejected', reviewNote, user.id, now, id),
      db
        .prepare(
          "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Solicitud rechazada',?,NULL,?)"
        )
        .bind(
          newId(), proof.courierUserId, 'membresia',
          `Tu solicitud de pago del plan ${proof.planName ?? '(sin plan)'} fue rechazada. Motivo: ${reviewNote}`,
          now,
        ),
    ]);
    await audit(
      env, user.id, 'payment.rejected', 'PaymentProof', id,
      `Mensajero: ${proof.courierName}. Plan: ${proof.planName ?? '—'}. Importe: ${proof.amountCup} CUP. Motivo: ${reviewNote}`,
    );
    return { ok: true, status: 'rejected' };
  }

  // ─── Aprobación (batch atómico) ───
  const plan = (await db.prepare('SELECT * FROM MembershipPlan WHERE id=? LIMIT 1').bind(proof.planId).first()) as unknown as {
    id: string;
    code: string;
    name: string;
    durationDays: number;
    permanenceCredits: number;
    toolCredits: number;
  };
  const courierId = proof.courierId;

  // Membresía vigente actual y limpieza de vencidas.
  const current = await db
    .prepare("SELECT id, expiresAt FROM Membership WHERE courierId=? AND status='active' AND expiresAt > ? ORDER BY expiresAt DESC LIMIT 1")
    .bind(courierId, now)
    .first<{ id: string; expiresAt: number }>();
  const base = current && current.expiresAt > now ? current.expiresAt : now;
  const newExpiresAt = base + plan.durationDays * DAY_MS;

  let wallet = await getWallet(env, courierId);
  const stmts: D1PreparedStatement[] = [
    // 1) Comprobante aprobado con la cantidad que el propietario declaró recibir.
    db
      .prepare('UPDATE PaymentProof SET status=?, confirmedAmountCup=?, reviewNote=?, reviewedBy=?, reviewedAt=? WHERE id=?')
      .bind('approved', confirmedAmountCup, reviewNote || null, user.id, now, id),
    // 2) Las "activas" ya vencidas pasan a expired; la vigente queda sustituida.
    db.prepare("UPDATE Membership SET status='expired' WHERE courierId=? AND status='active' AND expiresAt<=?").bind(courierId, now),
  ];
  if (current) {
    stmts.push(db.prepare("UPDATE Membership SET status='expired' WHERE id=?").bind(current.id));
  }
  stmts.push(
    db
      .prepare("INSERT INTO Membership(id,courierId,planId,startedAt,expiresAt,status,createdAt) VALUES(?,?,?,?,?,'active',?)")
      .bind(newId(), courierId, plan.id, now, newExpiresAt, now),
  );
  // 3) Cartera (upsert) + transacciones.
  if (!wallet) {
    const wid = newId();
    stmts.push(
      db.prepare('INSERT INTO Wallet(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES(?,?,0,0,NULL,?)').bind(wid, courierId, now),
    );
    wallet = { id: wid, courierId, permanenceCredits: 0, toolCredits: 0, lastConsumedAt: null };
  }
  const reason = `plan:${plan.code}`;
  if (plan.permanenceCredits > 0) {
    const after = wallet.permanenceCredits + plan.permanenceCredits;
    stmts.push(
      db.prepare('UPDATE Wallet SET permanenceCredits=?, updatedAt=? WHERE id=?').bind(after, now, wallet.id),
      db
        .prepare('INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(newId(), wallet.id, 'permanence', user.id, reason, proof.reference || plan.code, wallet.permanenceCredits, plan.permanenceCredits, after, now),
    );
  }
  if (plan.toolCredits > 0) {
    const after = wallet.toolCredits + plan.toolCredits;
    stmts.push(
      db.prepare('UPDATE Wallet SET toolCredits=?, updatedAt=? WHERE id=?').bind(after, now, wallet.id),
      db
        .prepare('INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(newId(), wallet.id, 'tools', user.id, reason, proof.reference || plan.code, wallet.toolCredits, plan.toolCredits, after, now),
    );
  }
  // 4) Perfil oculto por permanencia agotada → vuelve a ser visible.
  if (!proof.courierIsPublic) {
    stmts.push(
      db.prepare('UPDATE CourierProfile SET isPublic=1 WHERE id=?').bind(courierId),
      db.prepare('UPDATE Wallet SET lastConsumedAt=? WHERE id=?').bind(now, wallet.id),
    );
  }
  await db.batch(stmts);

  // Reconciliación lazy para refrescar visibilidad/saldos con reloj del servidor.
  await reconcileWallet(env, courierId);

  const confirmed = confirmedAmountCup !== null ? confirmedAmountCup : proof.amountCup;
  await db
    .prepare(
      "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Plan activado',?,NULL,?)"
    )
    .bind(
      newId(), proof.courierUserId, 'membresia',
      `Tu plan ${plan.name} está activo hasta el ${new Date(newExpiresAt).toLocaleDateString('es-CU')}. Cantidad confirmada: ${confirmed} CUP.`,
      now,
    )
    .run();
  await audit(
    env,
    user.id,
    'payment.approved',
    'PaymentProof',
    id,
    `Mensajero: ${proof.courierName}. Plan: ${plan.name} (${plan.code}). Solicitado: ${proof.amountCup} CUP. Confirmado: ${confirmed} CUP. Vence: ${new Date(newExpiresAt).toISOString()}. Créditos: +${plan.permanenceCredits} permanencia, +${plan.toolCredits} herramientas.`,
  );

  return { ok: true, status: 'approved', expiresAt: new Date(newExpiresAt).toISOString() };
}

// ─── POST /admin/plans y /admin/tools ───────────────────────────────────────
export async function adminSavePlan(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const code = asString(body.code)?.trim() ?? '';
  const name = asString(body.name)?.trim() ?? '';
  if (!code) throw new HttpError(400, 'El plan necesita un código.');
  if (!name) throw new HttpError(400, 'El plan necesita un nombre.');

  const description = asString(body.description)?.trim() ?? '';
  const durationDays = asInt(body.durationDays);
  if (durationDays === null || durationDays <= 0) throw new HttpError(400, 'La duración debe ser un número de días mayor que cero.');
  const priceCup = asInt(body.priceCup);
  if (priceCup === null || priceCup < 0) throw new HttpError(400, 'Importe no válido.');
  const permanenceCredits = asInt(body.permanenceCredits);
  if (permanenceCredits === null || permanenceCredits < 0) throw new HttpError(400, 'Créditos de permanencia no válidos.');
  const toolCredits = asInt(body.toolCredits);
  if (toolCredits === null || toolCredits < 0) throw new HttpError(400, 'Créditos de herramientas no válidos.');
  const isActive = asBool(body.isActive) ?? true;
  const isProposal = asBool(body.isProposal) ?? true;
  const sortOrder = asInt(body.sortOrder) ?? 99;

  const now = nowMs();
  const existing = await db.prepare('SELECT id FROM MembershipPlan WHERE code=? LIMIT 1').bind(code).first<{ id: string }>();
  let planId = existing?.id;
  if (existing) {
    await db
      .prepare(
        'UPDATE MembershipPlan SET name=?, description=?, durationDays=?, priceCup=?, permanenceCredits=?, toolCredits=?, isActive=?, isTrial=0, isProposal=?, sortOrder=?, updatedAt=? WHERE id=?'
      )
      .bind(name, description, durationDays, priceCup, permanenceCredits, toolCredits, isActive ? 1 : 0, isProposal ? 1 : 0, sortOrder, now, existing.id)
      .run();
  } else {
    planId = newId();
    await db
      .prepare(
        'INSERT INTO MembershipPlan(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?)'
      )
      .bind(planId, code, name, description, durationDays, priceCup, permanenceCredits, toolCredits, isActive ? 1 : 0, isProposal ? 1 : 0, sortOrder, now, now)
      .run();
  }

  await audit(env, user.id, 'plan.upsert', 'MembershipPlan', planId as string, `Plan ${code} (${name}) guardado.`);
  const plan = (await db.prepare('SELECT * FROM MembershipPlan WHERE id=? LIMIT 1').bind(planId).first()) as unknown as PlanRow;
  return { plan: toPlanDto(plan) };
}

export async function adminSaveTool(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const code = asString(body.code)?.trim() ?? '';
  const name = asString(body.name)?.trim() ?? '';
  if (!code) throw new HttpError(400, 'La herramienta necesita un código.');
  if (!name) throw new HttpError(400, 'La herramienta necesita un nombre.');

  const description = asString(body.description)?.trim() ?? '';
  const tag = asString(body.tag)?.trim() || 'BÁSICO';
  const minPlanCodeRaw = body.minPlanCode;
  const minPlanCode =
    minPlanCodeRaw === null || minPlanCodeRaw === undefined || minPlanCodeRaw === ''
      ? null
      : asString(minPlanCodeRaw)?.trim() ?? null;
  const creditCost = asInt(body.creditCost);
  if (creditCost === null || creditCost < 0) throw new HttpError(400, 'El coste en créditos no es válido.');
  const requiresActiveMembership = asBool(body.requiresActiveMembership) ?? true;
  const isActive = asBool(body.isActive) ?? true;
  const blockedMessage = asString(body.blockedMessage)?.trim() ?? '';
  const sortOrder = asInt(body.sortOrder) ?? 99;

  const now = nowMs();
  const existing = await db.prepare('SELECT id FROM Tool WHERE code=? LIMIT 1').bind(code).first<{ id: string }>();
  let toolId = existing?.id;
  if (existing) {
    await db
      .prepare(
        'UPDATE Tool SET name=?, description=?, tag=?, minPlanCode=?, creditCost=?, requiresActiveMembership=?, isActive=?, blockedMessage=?, sortOrder=?, updatedAt=? WHERE id=?'
      )
      .bind(name, description, tag, minPlanCode, creditCost, requiresActiveMembership ? 1 : 0, isActive ? 1 : 0, blockedMessage, sortOrder, now, existing.id)
      .run();
  } else {
    toolId = newId();
    await db
      .prepare(
        'INSERT INTO Tool(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
      )
      .bind(toolId, code, name, description, tag, minPlanCode, creditCost, requiresActiveMembership ? 1 : 0, isActive ? 1 : 0, blockedMessage, sortOrder, now, now)
      .run();
  }

  await audit(env, user.id, 'tool.upsert', 'Tool', toolId as string, `Herramienta ${code} (${name}) guardada.`);
  const tool = (await db.prepare('SELECT * FROM Tool WHERE id=? LIMIT 1').bind(toolId).first()) as unknown as ToolRow;
  return { tool: toToolDto(tool) };
}

// ─── GET /admin/moderation ──────────────────────────────────────────────────
export async function adminModeration(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'moderator');
  const db = env.D1_CORE;

  const reports = await db
    .prepare(
      `SELECT rf.id, rf.targetType, rf.targetId, rf.reason, rf.status, rf.createdAt, u.fullName AS reporterName
       FROM ReportFlag rf JOIN User u ON u.id=rf.reporterId
       ORDER BY rf.createdAt DESC LIMIT 100`
    )
    .all();
  const auditLogs = await db
    .prepare(
      `SELECT a.id, a.action, a.entityType, a.entityId, a.detail, a.createdAt, u.fullName AS actorName
       FROM AuditLog a LEFT JOIN User u ON u.id=a.actorId
       ORDER BY a.createdAt DESC LIMIT 50`
    )
    .all();

  return {
    reports: ((reports.results ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id,
      reporterName: r.reporterName,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: new Date(r.createdAt as number).toISOString(),
    })),
    audit: ((auditLogs.results ?? []) as Array<Record<string, unknown>>).map((a) => ({
      id: a.id,
      actorName: (a.actorName as string | null) ?? 'Sistema',
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      detail: a.detail,
      createdAt: new Date(a.createdAt as number).toISOString(),
    })),
  };
}

// ─── PATCH /admin/reports/:id ───────────────────────────────────────────────
export async function adminResolveReport(
  request: Request,
  env: V2Env,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'moderator');

  const status = asString(body.status) ?? '';
  if (status !== 'reviewed' && status !== 'dismissed') throw new HttpError(400, 'Estado no válido.');

  const report = await env.D1_CORE.prepare('SELECT id, targetType FROM ReportFlag WHERE id=? LIMIT 1').bind(id).first<{ id: string; targetType: string }>();
  if (!report) throw new HttpError(404, 'Reporte no encontrado.');

  await env.D1_CORE.prepare('UPDATE ReportFlag SET status=? WHERE id=?').bind(status, id).run();
  await audit(env, user.id, 'report.resolved', 'ReportFlag', id, `Reporte de ${report.targetType} marcado como ${status}.`);
  return { ok: true };
}

// ─── GET /admin/system ──────────────────────────────────────────────────────
export async function adminSystem(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  let databaseOk = true;
  let territories = 0;
  let couriers = 0;
  let users = 0;
  let routes = 0;
  let conversations = 0;
  let notifications = 0;
  let auditEvents = 0;
  let demoCouriers = 0;

  try {
    [
      territories,
      couriers,
      users,
      routes,
      conversations,
      notifications,
      auditEvents,
      demoCouriers,
    ] = await Promise.all([
      count(env, 'SELECT COUNT(*) AS n FROM Municipality'),
      count(env, 'SELECT COUNT(*) AS n FROM CourierProfile'),
      count(env, 'SELECT COUNT(*) AS n FROM User'),
      count(env, 'SELECT COUNT(*) AS n FROM Route'),
      count(env, 'SELECT COUNT(*) AS n FROM Conversation'),
      count(env, 'SELECT COUNT(*) AS n FROM Notification'),
      count(env, 'SELECT COUNT(*) AS n FROM AuditLog'),
      count(env, 'SELECT COUNT(*) AS n FROM CourierProfile WHERE isDemo=1'),
    ]);
  } catch {
    databaseOk = false;
  }

  const demoShare = couriers > 0 ? Math.round((demoCouriers / couriers) * 1000) / 10 : 0;
  return { databaseOk, territories, couriers, users, routes, conversations, notifications, auditEvents, demoShare };
}

// ─── /admin/config ──────────────────────────────────────────────────────────
const OWNER_ONLY_KEYS = ['payment_method', 'payment_card', 'payment_phone', 'payment_note'];

export async function adminGetConfig(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const rows = await env.D1_CORE.prepare('SELECT key, value FROM PlatformConfig').all();
  const config: Record<string, string> = {};
  for (const r of (rows.results ?? []) as Array<{ key: string; value: string }>) config[r.key] = r.value;
  return { config };
}

export async function adminSaveConfig(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user, 'admin');
  const db = env.D1_CORE;

  const config = body.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new HttpError(400, 'Formato de configuración no válido.');
  }
  const entries = Object.entries(config as Record<string, unknown>).filter(
    ([k, v]) => typeof k === 'string' && k.trim().length > 0 && typeof v === 'string',
  ) as [string, string][];
  if (entries.length === 0) throw new HttpError(400, 'No hay claves válidas que guardar.');

  // Las claves de pago (tarjeta/método/teléfono/nota) solo las cambia el propietario.
  if (entries.some(([k]) => OWNER_ONLY_KEYS.includes(k))) {
    requireRole(user, 'owner');
  }

  const now = nowMs();
  const stmts: D1PreparedStatement[] = [];
  for (const [key, value] of entries) {
    stmts.push(
      db
        .prepare('INSERT INTO PlatformConfig(key,value,updatedAt) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt')
        .bind(key, value, now),
    );
  }
  await db.batch(stmts);

  await audit(env, user.id, 'config.update', 'PlatformConfig', 'global', `Claves actualizadas: ${entries.map(([k]) => k).join(', ')}.`);
  return { ok: true };
}
