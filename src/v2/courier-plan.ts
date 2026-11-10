// MENRUT v2 — Membresía (prueba gratuita) y verificación de identidad del
// mensajero: la prueba se acredita en el shard; la verificación es una decisión
// administrativa global (CORE) que actualiza el shard y la proyección.
import { asString, checkRate, HttpError, newId, nowMs, requireExactRole, type V2Env } from './core';
import { requireAuth } from './identity';
import { requireCourierShard } from './courier';
import { bumpProfileVersion, syncProjection } from './shard';
import { activateTrial } from './wallet';

// ─── POST /courier/me/membership (prueba directa o solicitud de pago) ───────
export async function requestMembership(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `membership:${user.id}`, 10, 60_000);
  await requireCourierShard(env, user.id);

  const planCode = asString(body.planCode)?.trim() ?? '';
  if (!planCode) throw new HttpError(400, 'Selecciona un plan.');
  const plan = await env.D1_CORE
    .prepare('SELECT id, name, isActive, isTrial FROM MembershipPlan WHERE code=? LIMIT 1')
    .bind(planCode)
    .first<{ id: string; name: string; isActive: number; isTrial: number }>();
  if (!plan || !plan.isActive) throw new HttpError(400, 'El plan seleccionado no está disponible.');

  if (plan.isTrial) {
    if (user.hasUsedTrial) throw new HttpError(409, 'La prueba gratuita ya fue utilizada.');
    const activated = await activateTrial(env, user.id);
    if (!activated) throw new HttpError(409, 'La prueba gratuita ya fue utilizada.');
    await syncProjection(env, user.id).catch(() => null);
    return { ok: true, status: 'active' };
  }
  throw new HttpError(400, 'Los planes de pago se solicitan desde /payments/request.');
}

// ─── POST /courier/me/verification ──────────────────────────────────────────
export async function submitVerification(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `verification:${user.id}`, 5, 60 * 60_000);
  const { db, profile } = await requireCourierShard(env, user.id);

  if (profile.verification_status === 'verified') throw new HttpError(400, 'Tu cuenta ya está verificada.');
  const pending = await env.D1_CORE
    .prepare("SELECT id FROM courier_verifications WHERE courier_id=? AND status='pending' LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (pending) throw new HttpError(409, 'Ya tienes una solicitud de verificación en revisión.');

  const note = asString(body.note)?.trim() ?? '';
  if (note.length < 10 || note.length > 500) throw new HttpError(400, 'Explica brevemente tu actividad (entre 10 y 500 caracteres).');
  const documentUrl = asString(body.documentUrl)?.trim() ?? '';
  if (documentUrl.length > 500) throw new HttpError(400, 'La URL del documento es demasiado larga.');

  const nowSec = Math.floor(nowMs() / 1000);
  await env.D1_CORE.batch([
    env.D1_CORE
      .prepare("INSERT INTO courier_verifications(id,courier_id,document_url,note,status) VALUES(?,?,?,?,'pending')")
      .bind(newId(), user.id, documentUrl, note),
    env.D1_CORE
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'admin','Solicitud enviada',?)")
      .bind(newId(), user.id, 'Tu solicitud de verificación está en revisión. Te notificaremos el resultado.'),
  ]);
  await db.prepare("UPDATE courier_profiles SET verification_status='pending' WHERE user_id=?").bind(user.id).run();
  await bumpProfileVersion(env, user.id);
  await syncProjection(env, user.id).catch(() => null);
  return { ok: true };
}
