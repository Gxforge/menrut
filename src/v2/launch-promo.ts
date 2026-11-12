// MENRUT v2 — Promoción de lanzamiento.
// 1) Cupos gratuitos por municipio (10): 1 mes (cupo 1), 2 meses (cupos 2–4, dos
//    acreditaciones de 1 mes) y 1 mes (cupos 5–10). Se reclaman por orden de
//    pulsación con un UPDATE condicional: sin carreras entre dos clics.
// 2) Descuento del 20 % en todos los planes de pago hasta la fecha de fin, sin
//    límite de usuarios. Es temporal: se apaga solo al llegar a la fecha.
// Las acreditaciones usan creditGrant (idempotente por operationId), igual que
// un pago aprobado por el admin. Un reintento nunca duplica créditos.
import { asString, checkRate, HttpError, requireExactRole, type V2Env } from './core';
import { requireAuth } from './identity';
import { requireCourierShard } from './courier';
import { syncProjection } from './shard';
import { creditGrant } from './wallet';

export const LAUNCH_DISCOUNT_PERCENT = 20;
// Fin exclusivo: el descuento vale hasta el 30 de noviembre de 2026 incluido (hora de Cuba, UTC-5 en noviembre).
export const LAUNCH_DISCOUNT_ENDS_AT = '2026-12-01T00:00:00-05:00';
export const LAUNCH_FREE_PLAN_CODE = 'basic-1m';

type SlotKind = 'free_1m' | 'free_2m';

export function launchDiscountActive(now: number = Date.now()): boolean {
  return now < Date.parse(LAUNCH_DISCOUNT_ENDS_AT);
}

/** Precio que se cobra: el de catálogo, o el descontado si la promo está activa. La prueba gratuita no se descuenta. */
export function discountedPriceCup(priceCup: number, isTrial: boolean, now: number = Date.now()): number {
  if (isTrial || !launchDiscountActive(now)) return priceCup;
  return Math.round((priceCup * (100 - LAUNCH_DISCOUNT_PERCENT)) / 100);
}

const monthsOf = (kind: SlotKind): number => (kind === 'free_2m' ? 2 : 1);

async function requireCourier(request: Request, env: V2Env) {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  return user;
}

// ─── GET /courier/me/launch-promo ───────────────────────────────────────────
export async function launchPromoStatus(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const user = await requireCourier(request, env);
  const db = env.D1_CORE;

  const base = await db
    .prepare(
      'SELECT b.municipality_id AS id, m.name AS name FROM courier_base_municipality b JOIN Municipality m ON m.id = b.municipality_id WHERE b.user_id=? LIMIT 1',
    )
    .bind(user.id)
    .first<{ id: string; name: string }>();

  const claim = await db
    .prepare('SELECT municipality_id, kind, claimed_at, granted_at FROM launch_promo_claims WHERE user_id=? LIMIT 1')
    .bind(user.id)
    .first<{ municipality_id: string; kind: SlotKind; claimed_at: number; granted_at: number | null }>();

  let remaining: number | null = null;
  if (base) {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM launch_promo_slots WHERE municipality_id=? AND claimed_by IS NULL')
      .bind(base.id)
      .first<{ n: number }>();
    remaining = row?.n ?? 0;
  }

  return {
    discount: {
      percent: LAUNCH_DISCOUNT_PERCENT,
      active: launchDiscountActive(),
      endsAt: LAUNCH_DISCOUNT_ENDS_AT,
    },
    municipality: base ? { id: base.id, name: base.name } : null,
    cupos: base ? { total: 10, remaining } : null,
    claim: claim
      ? {
          municipalityId: claim.municipality_id,
          months: monthsOf(claim.kind),
          granted: claim.granted_at !== null,
          claimedAt: claim.claimed_at,
        }
      : null,
  };
}

// ─── PUT /courier/me/base-municipality ──────────────────────────────────────
export async function setBaseMunicipality(
  request: Request,
  env: V2Env,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const user = await requireCourier(request, env);
  await checkRate(env, `base-mun:${user.id}`, 10, 60_000);

  const provinceId = asString(body.provinceId)?.trim() ?? '';
  const municipalityId = asString(body.municipalityId)?.trim() ?? '';
  if (!provinceId || !municipalityId) throw new HttpError(400, 'Indica provincia y municipio.');

  const mun = await env.D1_CORE
    .prepare('SELECT id, provinceId FROM Municipality WHERE id=? LIMIT 1')
    .bind(municipalityId)
    .first<{ id: string; provinceId: string }>();
  if (!mun || mun.provinceId !== provinceId) throw new HttpError(400, 'El municipio no pertenece a esa provincia.');

  const claim = await env.D1_CORE
    .prepare('SELECT municipality_id FROM launch_promo_claims WHERE user_id=? LIMIT 1')
    .bind(user.id)
    .first<{ municipality_id: string }>();
  if (claim && claim.municipality_id !== municipalityId) {
    throw new HttpError(409, 'Ya reclamaste tu plan de lanzamiento en otro municipio.');
  }

  await env.D1_CORE
    .prepare(
      `INSERT INTO courier_base_municipality(user_id, province_id, municipality_id, updated_at) VALUES(?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET province_id=excluded.province_id, municipality_id=excluded.municipality_id, updated_at=excluded.updated_at`,
    )
    .bind(user.id, provinceId, municipalityId, Date.now())
    .run();
  return { ok: true, municipalityId };
}

// Acredita los meses del cupo con el plan mensual. Cada mes es una acreditación
// con operationId propio: si falla a mitad, el reintento completa lo que falta.
async function grantPromo(env: V2Env, uid: string, kind: SlotKind): Promise<number | null> {
  const plan = await env.D1_CORE
    .prepare('SELECT id, permanenceCredits, toolCredits FROM MembershipPlan WHERE code=? LIMIT 1')
    .bind(LAUNCH_FREE_PLAN_CODE)
    .first<{ id: string; permanenceCredits: number; toolCredits: number }>();
  if (!plan) throw new HttpError(503, 'El plan mensual del lanzamiento no está configurado.');

  let expiresAt: number | null = null;
  for (let k = 1; k <= monthsOf(kind); k++) {
    const granted = await creditGrant(env, uid, {
      operationId: `promo-launch:${uid}:${k}`,
      planId: plan.id,
      permanenceCredits: plan.permanenceCredits,
      toolCredits: plan.toolCredits,
    });
    if (granted) expiresAt = granted.expiresAt;
  }
  await syncProjection(env, uid).catch(() => null);
  return expiresAt;
}

// ─── POST /courier/me/launch-promo/claim ────────────────────────────────────
export async function claimLaunchPromo(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const user = await requireCourier(request, env);
  await checkRate(env, `launch-promo:${user.id}`, 5, 60_000);
  await requireCourierShard(env, user.id);
  const db = env.D1_CORE;

  // Reintento de un cupo ya reclamado: completa las acreditaciones pendientes.
  const existing = await db
    .prepare('SELECT municipality_id, seq, kind, granted_at FROM launch_promo_claims WHERE user_id=? LIMIT 1')
    .bind(user.id)
    .first<{ municipality_id: string; seq: number; kind: SlotKind; granted_at: number | null }>();
  if (existing) {
    if (existing.granted_at !== null) throw new HttpError(409, 'Ya reclamaste tu plan de lanzamiento.');
    const expiresAt = await grantPromo(env, user.id, existing.kind);
    await db.prepare('UPDATE launch_promo_claims SET granted_at=? WHERE user_id=?').bind(Date.now(), user.id).run();
    return { ok: true, months: monthsOf(existing.kind), expiresAt, status: 'completed' };
  }

  const base = await db
    .prepare('SELECT municipality_id FROM courier_base_municipality WHERE user_id=? LIMIT 1')
    .bind(user.id)
    .first<{ municipality_id: string }>();
  if (!base) throw new HttpError(400, 'Indica tu provincia y municipio antes de reclamar el plan.');
  const municipalityId = base.municipality_id;

  // Toma el primer cupo libre. El UPDATE condicional solo gana una vez por cupo.
  let won: { seq: number; kind: SlotKind } | null = null;
  for (let attempt = 0; attempt < 5 && !won; attempt++) {
    const next = await db
      .prepare('SELECT seq, kind FROM launch_promo_slots WHERE municipality_id=? AND claimed_by IS NULL ORDER BY seq ASC LIMIT 1')
      .bind(municipalityId)
      .first<{ seq: number; kind: SlotKind }>();
    if (!next) break;
    const upd = await db
      .prepare('UPDATE launch_promo_slots SET claimed_by=?, claimed_at=? WHERE municipality_id=? AND seq=? AND claimed_by IS NULL')
      .bind(user.id, Date.now(), municipalityId, next.seq)
      .run();
    if ((upd.meta?.changes ?? 0) === 1) won = next;
  }
  if (!won) throw new HttpError(409, 'Se agotaron los cupos de lanzamiento de tu municipio.');

  // Registra la reclamación. Si otro clic del mismo usuario ganó antes, libera el cupo.
  try {
    await db
      .prepare('INSERT INTO launch_promo_claims(user_id, municipality_id, seq, kind, claimed_at, granted_at) VALUES(?,?,?,?,?,NULL)')
      .bind(user.id, municipalityId, won.seq, won.kind, Date.now())
      .run();
  } catch {
    await db
      .prepare('UPDATE launch_promo_slots SET claimed_by=NULL, claimed_at=NULL WHERE municipality_id=? AND seq=? AND claimed_by=?')
      .bind(municipalityId, won.seq, user.id)
      .run();
    throw new HttpError(409, 'Ya reclamaste tu plan de lanzamiento.');
  }

  const expiresAt = await grantPromo(env, user.id, won.kind);
  await db.prepare('UPDATE launch_promo_claims SET granted_at=? WHERE user_id=?').bind(Date.now(), user.id).run();
  await db
    .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'membresia','Plan de lanzamiento activado',?)")
    .bind(
      `promo-${user.id}`,
      user.id,
      `Tu plan mensual gratis está activo${won.kind === 'free_2m' ? ' por 2 meses' : ' por 1 mes'}. Cupo ${won.seq} de 10 en tu municipio.`,
    )
    .run()
    .catch(() => null);

  return { ok: true, months: monthsOf(won.kind), seq: won.seq, expiresAt, status: 'completed' };
}
