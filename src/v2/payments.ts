// MENRUT v2 — Pagos manuales por Transfermóvil: el mensajero elige plan,
// recibe instrucciones (PlatformConfig), paga y sube la captura al bucket
// PRIVADO con service_role (nunca desde el navegador); el propietario decide y
// la acreditación al shard es idempotente (ver admin-payments.ts y wallet.ts).
import {
  asString,
  audit,
  checkRate,
  HttpError,
  newId,
  nowMs,
  requireExactRole,
  supabaseRemove,
  supabaseUpload,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { requireCourierShard } from './courier';
import { PAYMENT_PROOF_SELECT, toPaymentProofDto, type PaymentProofRow } from './dto';

const BUCKET = 'payment-proofs-private';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Instrucciones de cobro reales (PlatformConfig); falla si no están sembradas.
async function readPaymentInstructions(
  env: V2Env,
  amountCup: number,
  planName: string,
): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE
    .prepare(
      "SELECT key, value FROM PlatformConfig WHERE key IN ('payment_method','payment_card','payment_phone','payment_note')"
    )
    .all();
  const cfg = new Map(((rows.results ?? []) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value]));
  const method = cfg.get('payment_method') ?? '';
  const card = cfg.get('payment_card') ?? '';
  if (!method || !card) {
    throw new HttpError(500, 'La configuración de pago no está disponible. Contacta al soporte.');
  }
  return {
    method,
    card,
    phone: cfg.get('payment_phone') ?? '',
    note: cfg.get('payment_note') ?? '',
    amountCup,
    planName,
  };
}

// ─── POST /payments/request ─────────────────────────────────────────────────
export async function requestPlan(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `payment-request:${user.id}`, 10, 60_000);
  const db = env.D1_CORE;
  await requireCourierShard(env, user.id);

  const planId = asString(body.planId)?.trim() ?? '';
  if (!planId) throw new HttpError(400, 'Selecciona un plan.');
  const plan = await db
    .prepare('SELECT id, code, name, priceCup, isActive, isTrial FROM MembershipPlan WHERE id=? LIMIT 1')
    .bind(planId)
    .first<{ id: string; code: string; name: string; priceCup: number; isActive: number; isTrial: number }>();
  if (!plan || !plan.isActive) throw new HttpError(400, 'El plan seleccionado no está disponible.');
  if (plan.isTrial) {
    throw new HttpError(400, 'La prueba gratuita no requiere pago: actívala desde tus membresías.');
  }

  // Una sola solicitud pendiente por mensajero.
  const pending = await db
    .prepare("SELECT id FROM payment_proofs WHERE courier_id=? AND status IN ('pending','approved') LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (pending) throw new HttpError(409, 'Ya tienes una solicitud en revisión.');

  const proofId = newId();
  await db
    .prepare(
      "INSERT INTO payment_proofs(id,courier_id,submitted_by,plan_id,amount_cup,method,reference,proof_url,status,created_at) VALUES(?,?,?,?,?,'transfermovil','','','pending',?)"
    )
    .bind(proofId, user.id, user.id, plan.id, plan.priceCup, Math.floor(nowMs() / 1000))
    .run();

  const proof = (await db
    .prepare(`${PAYMENT_PROOF_SELECT} WHERE pp.id=? LIMIT 1`)
    .bind(proofId)
    .first()) as unknown as PaymentProofRow;
  const instructions = await readPaymentInstructions(env, plan.priceCup, plan.name);

  await audit(
    env,
    user.id,
    'payment.requested',
    'payment_proofs',
    proofId,
    `Mensajero: ${user.fullName}. Plan: ${plan.name} (${plan.code}). Importe: ${plan.priceCup} CUP.`,
  );

  return { proof: toPaymentProofDto(proof), instructions };
}

// ─── POST /payments/:id/proof (multipart/form-data, campo file) ─────────────
export async function uploadProof(request: Request, env: V2Env, proofId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `payment-proof:${user.id}`, 10, 60_000);
  const db = env.D1_CORE;
  await requireCourierShard(env, user.id);

  const proof = await db
    .prepare('SELECT id, courier_id, status, proof_url FROM payment_proofs WHERE id=? LIMIT 1')
    .bind(proofId)
    .first<{ id: string; courier_id: string; status: string; proof_url: string }>();
  if (!proof || proof.courier_id !== user.id) throw new HttpError(404, 'Solicitud de pago no encontrada.');
  if (proof.status !== 'pending') {
    throw new HttpError(409, 'Esta solicitud ya fue revisada y no admite más comprobantes.');
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    throw new HttpError(400, 'Adjunta la captura de la transferencia (imagen JPG, PNG o WebP).');
  }
  const contentType = file.type || '';
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) throw new HttpError(400, 'Formato no válido: sube una imagen JPG, PNG o WebP.');
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new HttpError(400, 'La imagen supera el tamaño máximo de 5 MB.');
  }

  const buffer = await file.arrayBuffer();
  const path = `proofs/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  await supabaseUpload(env, BUCKET, path, buffer, contentType);

  // Si reemplaza una captura anterior, se elimina del bucket (best-effort).
  if (proof.proof_url && !proof.proof_url.startsWith('http')) {
    await supabaseRemove(env, BUCKET, [proof.proof_url]);
  }

  await db.prepare('UPDATE payment_proofs SET proof_url=? WHERE id=?').bind(path, proof.id).run();

  await audit(
    env,
    user.id,
    'payment.proof_uploaded',
    'payment_proofs',
    proof.id,
    `Mensajero: ${user.fullName}. Archivo: ${path} (${file.size} bytes).`,
  );

  const updated = (await db
    .prepare(`${PAYMENT_PROOF_SELECT} WHERE pp.id=? LIMIT 1`)
    .bind(proof.id)
    .first()) as unknown as PaymentProofRow;
  return { proof: toPaymentProofDto(updated) };
}

// ─── GET /payments/mine ─────────────────────────────────────────────────────
export async function myPayments(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const rows = await env.D1_CORE
    .prepare(`${PAYMENT_PROOF_SELECT} WHERE pp.courier_id=? ORDER BY pp.created_at DESC`)
    .bind(user.id)
    .all();
  return { payments: ((rows.results ?? []) as unknown as PaymentProofRow[]).map(toPaymentProofDto) };
}
