// MENRUT v2 — Panel de administración (2/4): pagos Transfermóvil. La decisión
// de aprobación acredita la cartera del SHARD del mensajero de forma
// IDEMPOTENTE (operation_id = pago; UNIQUE del ledger + processed_events) y
// marca el comprobante 'credited'. Sin transacciones atómicas entre dos D1:
// el reintento es seguro y la reconciliación reutiliza el mismo camino.
import {
  asInt,
  asString,
  audit,
  HttpError,
  newId,
  nowMs,
  requireRole,
  supabaseSignedUrls,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { syncProjection } from './shard';
import { toPaymentProofDto, PAYMENT_PROOF_SELECT, type PaymentProofRow } from './dto';
import { creditGrant } from './wallet';

const BUCKET = 'payment-proofs-private';
const SIGNED_URL_TTL = 600; // 10 minutos

interface AdminProofRow extends PaymentProofRow {
  courierName: string | null;
  courierEmail: string | null;
  courierIsPublic: number | null;
}

const ADMIN_PROOF_SELECT = `SELECT pp.id, pp.courier_id AS courierId, pp.submitted_by AS submittedBy,
 pp.plan_id AS planId, pp.amount_cup AS amountCup, pp.confirmed_amount_cup AS confirmedAmountCup,
 pp.method, pp.reference, pp.proof_url AS proofUrl, pp.status, pp.review_note AS reviewNote,
 pp.reviewed_by AS reviewedBy, pp.reviewed_at AS reviewedAt, pp.created_at AS createdAt,
 mp.name AS planName, mp.code AS planCode,
 p.full_name AS courierName, p.email AS courierEmail
 FROM payment_proofs pp
 LEFT JOIN MembershipPlan mp ON mp.id = pp.plan_id
 LEFT JOIN account_profiles p ON p.user_id = pp.courier_id`;

// ─── GET /admin/payments?status= ────────────────────────────────────────────
export async function adminPayments(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
  const db = env.D1_CORE;

  const statusParam = asString(url.searchParams.get('status'))?.trim() ?? '';
  const VALID = ['pending', 'approved', 'credited', 'rejected'];
  const where = statusParam && statusParam !== 'all' && VALID.includes(statusParam) ? 'pp.status=?' : '1=1';
  const params: unknown[] = [];
  if (where !== '1=1') params.push(statusParam);

  const proofs = await db
    .prepare(`${ADMIN_PROOF_SELECT} WHERE ${where} ORDER BY pp.created_at DESC LIMIT 200`)
    .bind(...params)
    .all();

  const rows = (proofs.results ?? []) as unknown as AdminProofRow[];
  const internalPaths = rows.map((p) => p.proofUrl).filter((p) => p && !p.startsWith('http'));
  const signed = await supabaseSignedUrls(env, BUCKET, [...new Set(internalPaths)], SIGNED_URL_TTL);

  return {
    payments: rows.map((p) => ({
      id: p.id,
      courierName: p.courierName ?? 'Mensajero',
      courierEmail: p.courierEmail ?? '',
      courierId: p.courierId,
      planName: p.planName ?? null,
      planCode: p.planCode ?? null,
      amountCup: p.amountCup,
      confirmedAmountCup: p.confirmedAmountCup,
      method: p.method,
      reference: p.reference,
      proofUrl: p.proofUrl,
      proofSignedUrl: p.proofUrl
        ? p.proofUrl.startsWith('http')
          ? p.proofUrl
          : signed.get(p.proofUrl) ?? null
        : null,
      hasProof: !!p.proofUrl,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: new Date(p.createdAt * 1000).toISOString(),
      reviewedAt: p.reviewedAt ? new Date(p.reviewedAt * 1000).toISOString() : null,
    })),
  };
}

// ─── PATCH /admin/payments/:id (decisión con acreditación idempotente) ──────
export async function adminDecidePayment(
  request: Request,
  env: V2Env,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireRole(user.role, 'admin');
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
    .prepare(`${ADMIN_PROOF_SELECT} WHERE pp.id=? LIMIT 1`)
    .bind(id)
    .first()) as unknown as AdminProofRow | null;
  if (!proof) throw new HttpError(404, 'Solicitud de pago no encontrada.');
  // Idempotencia: 'credited' ya está aplicada; 'approved' pendiente de reintento.
  if (!['pending', 'approved'].includes(proof.status)) throw new HttpError(409, 'Ya fue decidida.');
  if (action === 'reject' && !reviewNote) throw new HttpError(400, 'El motivo del rechazo es obligatorio.');
  if (action === 'approve' && !proof.planId) {
    throw new HttpError(400, 'La solicitud no tiene un plan asociado; no se puede aprobar.');
  }

  const nowSec = Math.floor(nowMs() / 1000);

  // ─── Rechazo ───
  if (action === 'reject') {
    const res = await db
      .prepare("UPDATE payment_proofs SET status='rejected', review_note=?, reviewed_by=?, reviewed_at=? WHERE id=? AND status='pending'")
      .bind(reviewNote, user.id, nowSec, id)
      .run();
    if (!res.meta.changes && proof.status !== 'pending') {
      throw new HttpError(409, 'Ya fue decidida.');
    }
    await db
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'membresia','Solicitud rechazada',?)")
      .bind(newId(), proof.courierId, `Tu solicitud de pago del plan ${proof.planName ?? '(sin plan)'} fue rechazada. Motivo: ${reviewNote}`)
      .run();
    await audit(
      env, user.id, 'payment.rejected', 'payment_proofs', id,
      `Mensajero: ${proof.courierName ?? proof.courierId}. Plan: ${proof.planName ?? '—'}. Importe: ${proof.amountCup} CUP. Motivo: ${reviewNote}`,
    );
    return { ok: true, status: 'rejected' };
  }

  // ─── Aprobación: registrar decisión en CORE ───
  const plan = await db
    .prepare('SELECT id, code, name, durationDays, permanenceCredits, toolCredits FROM MembershipPlan WHERE id=? LIMIT 1')
    .bind(proof.planId)
    .first<{ id: string; code: string; name: string; durationDays: number; permanenceCredits: number; toolCredits: number }>();
  if (!plan) throw new HttpError(400, 'El plan asociado no existe; no se puede aprobar.');

  await db
    .prepare("UPDATE payment_proofs SET status='approved', confirmed_amount_cup=?, review_note=?, reviewed_by=?, reviewed_at=? WHERE id=?")
    .bind(confirmedAmountCup, reviewNote || null, user.id, nowSec, id)
    .run();

  // ─── Acreditación idempotente en el shard del mensajero ───
  const granted = await creditGrant(env, proof.courierId, {
    operationId: `payment:${id}`,
    planId: plan.id,
    permanenceCredits: plan.permanenceCredits,
    toolCredits: plan.toolCredits,
  });

  if (granted) {
    await db.prepare("UPDATE payment_proofs SET status='credited' WHERE id=? AND status='approved'").bind(id).run();
    await db
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'membresia','Plan activado',?)")
      .bind(
        newId(), proof.courierId,
        `Tu plan ${plan.name} está activo hasta el ${new Date(granted.expiresAt * 1000).toISOString().slice(0, 10)}. Cantidad confirmada: ${confirmedAmountCup ?? proof.amountCup} CUP.`,
      )
      .run();
    await syncProjection(env, proof.courierId).catch(() => null);
  } else {
    // Ya acreditada antes (reintento): solo se asegura el estado final.
    await db.prepare("UPDATE payment_proofs SET status='credited' WHERE id=? AND status='approved'").bind(id).run();
  }

  const fresh = (await db.prepare(`${PAYMENT_PROOF_SELECT} WHERE pp.id=? LIMIT 1`).bind(id).first()) as unknown as PaymentProofRow;
  await audit(
    env, user.id, 'payment.approved', 'payment_proofs', id,
    `Mensajero: ${proof.courierName ?? proof.courierId}. Plan: ${plan.name} (${plan.code}). Solicitado: ${proof.amountCup} CUP. Confirmado: ${confirmedAmountCup ?? proof.amountCup} CUP. Créditos: +${plan.permanenceCredits} permanencia, +${plan.toolCredits} herramientas.`,
  );

  return { ok: true, status: 'credited', proof: toPaymentProofDto(fresh), expiresAt: granted ? new Date(granted.expiresAt * 1000).toISOString() : null };
}
