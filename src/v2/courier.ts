// MENRUT v2 — Endpoints del mensajero: dashboard, perfil profesional (en su
// shard + outbox → proyección), reputación, cartera (segundos), membresía y
// verificación de identidad. Las rutas CRUD viven en courier-routes.ts.
import {
  asInt,
  asString,
  checkRate,
  CONTACT_PREFERENCES,
  COVERAGE_TYPES,
  HttpError,
  newId,
  nowMs,
  requireExactRole,
  SERVICE_TYPES,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { assignedShard, bumpProfileVersion, syncProjection } from './shard';
import { toReviewDto, toWalletDto } from './dto';
import { activateTrial, activeMembership, getWallet, ledgerTransactions } from './wallet';

/** Perfil del mensajero en su shard; 409 claro si no existe. */
export async function requireCourierShard(
  env: V2Env,
  userId: string,
): Promise<{ db: D1Database; profile: Record<string, unknown> }> {
  const shard = await assignedShard(env, userId);
  if (!shard) {
    throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.');
  }
  const profile = await shard.db.prepare('SELECT * FROM courier_profiles WHERE user_id=?').bind(userId).first();
  if (!profile) {
    throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.');
  }
  return { db: shard.db, profile };
}

// ─── GET /courier/me ────────────────────────────────────────────────────────
export async function courierDashboard(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const { db, profile } = await requireCourierShard(env, user.id);

  const wallet = await getWallet(env, user.id);
  const membership = await activeMembership(env, user.id);

  const countRoutes = async (status: string) =>
    (await db.prepare('SELECT COUNT(*) AS n FROM courier_routes WHERE user_id=? AND status=?').bind(user.id, status).first<{ n: number }>())?.n ?? 0;

  const reviewAgg = (await db
    .prepare('SELECT rating_sum, rating_count, verified_deliveries FROM courier_profiles WHERE user_id=?')
    .bind(user.id)
    .first<{ rating_sum: number; rating_count: number; verified_deliveries: number }>()) ?? { rating_sum: 0, rating_count: 0, verified_deliveries: 0 };

  return {
    isPublic: profile.visible === 1,
    verificationStatus: profile.verification_status ?? 'unverified',
    coverageType: profile.coverage_type ?? 'municipal',
    ratingAvg: reviewAgg.rating_count > 0 ? reviewAgg.rating_sum / reviewAgg.rating_count : 0,
    ratingCount: reviewAgg.rating_count,
    verifiedDeliveries: reviewAgg.verified_deliveries,
    activeRoutes: await countRoutes('active'),
    scheduledRoutes: await countRoutes('scheduled'),
    pausedRoutes: await countRoutes('paused'),
    wallet: {
      permanenceCredits: Math.round((wallet?.permanence_seconds ?? 0) / 8640),
      toolCredits: wallet?.tool_credits ?? 0,
      hasActiveMembership: !!membership,
      planName: membership?.planName ?? null,
      planExpiresAt: membership ? new Date(membership.expiresAtMs).toISOString() : null,
    },
    courierId: user.id,
    hasUsedTrial: !!user.hasUsedTrial,
  };
}

// ─── PATCH /courier/me (perfil profesional en el shard) ─────────────────────
export async function updateCourierProfile(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const { db } = await requireCourierShard(env, user.id);

  const patch: string[] = [];
  const values: unknown[] = [];
  if ('bio' in body) {
    const bio = asString(body.bio) ?? '';
    if (bio.length > 600) throw new HttpError(400, 'La biografía es demasiado larga (máx. 600).');
    patch.push('description=?');
    values.push(bio.trim());
  }
  if ('yearsExperience' in body) {
    const years = asInt(body.yearsExperience);
    if (years === null || years < 0 || years > 60) throw new HttpError(400, 'Los años de experiencia deben estar entre 0 y 60.');
    patch.push('years_experience=?');
    values.push(years);
  }
  if ('vehicleSummary' in body) {
    const v = asString(body.vehicleSummary) ?? '';
    if (v.length > 120) throw new HttpError(400, 'El resumen de vehículo es demasiado largo.');
    patch.push('vehicle_summary=?');
    values.push(v.trim());
  }
  if ('availabilityNote' in body) {
    const a = asString(body.availabilityNote) ?? '';
    if (a.length > 200) throw new HttpError(400, 'La nota de disponibilidad es demasiado larga.');
    patch.push('availability_note=?');
    values.push(a.trim());
  }
  if ('baseFeeCup' in body) {
    if (body.baseFeeCup === null || body.baseFeeCup === '') {
      patch.push('base_fee_cup=NULL');
    } else {
      const fee = asInt(body.baseFeeCup);
      if (fee === null || fee < 0) throw new HttpError(400, 'La tarifa base debe ser un número positivo.');
      patch.push('base_fee_cup=?');
      values.push(fee);
    }
  }
  if ('contactPreference' in body) {
    const c = asString(body.contactPreference) ?? '';
    if (!(CONTACT_PREFERENCES as readonly string[]).includes(c)) throw new HttpError(400, 'Preferencia de contacto no válida.');
    patch.push('contact_preference=?');
    values.push(c);
  }
  if ('coverageType' in body) {
    const ct = asString(body.coverageType) ?? '';
    if (!(COVERAGE_TYPES as readonly string[]).includes(ct)) {
      throw new HttpError(400, 'Tipo de mensajero no válido (zona, municipal o provincial).');
    }
    patch.push('coverage_type=?');
    values.push(ct);
  }
  if ('isPublic' in body) {
    patch.push('visible=?');
    values.push(body.isPublic ? 1 : 0);
  }
  if ('baseMunicipalityId' in body) {
    const m = asString(body.baseMunicipalityId) ?? '';
    if (m) {
      const exists = await env.D1_CORE.prepare('SELECT 1 AS ok FROM Municipality WHERE id=?').bind(m).first();
      if (!exists) throw new HttpError(400, 'Municipio base no válido.');
      patch.push('municipality_id=?');
      values.push(m);
    }
  }

  if (patch.length > 0) {
    values.push(user.id);
    await db.prepare(`UPDATE courier_profiles SET ${patch.join(',')} WHERE user_id=?`).bind(...values).run();
  }

  // Servicios: reemplazo completo (mismo contrato que v2).
  if ('services' in body) {
    const raw = body.services;
    if (!Array.isArray(raw)) throw new HttpError(400, 'Formato de servicios no válido.');
    const wanted = [
      ...new Set(raw.filter((s): s is string => typeof s === 'string' && (SERVICE_TYPES as readonly string[]).includes(s))),
    ];
    const stmts: D1PreparedStatement[] = [];
    for (const t of wanted) {
      stmts.push(
        db.prepare('INSERT OR IGNORE INTO courier_services(id,user_id,name,price_minor) VALUES(?,?,?,0)').bind(newId(), user.id, t),
      );
    }
    if (wanted.length > 0) {
      const placeholders = wanted.map(() => '?').join(',');
      stmts.push(db.prepare(`DELETE FROM courier_services WHERE user_id=? AND name NOT IN (${placeholders})`).bind(user.id, ...wanted));
    } else {
      stmts.push(db.prepare('DELETE FROM courier_services WHERE user_id=?').bind(user.id));
    }
    await db.batch(stmts);
  }

  // Cobertura (municipios): reemplazo completo.
  if ('coverageMunicipalityIds' in body) {
    const raw = body.coverageMunicipalityIds;
    if (!Array.isArray(raw)) throw new HttpError(400, 'Formato de cobertura no válido.');
    const ids = [...new Set(raw.filter((s): s is string => typeof s === 'string' && s.length > 0))];
    if (ids.length > 0) {
      const valid = await env.D1_CORE
        .prepare(`SELECT id FROM Municipality WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .all();
      if ((valid.results ?? []).length !== ids.length) throw new HttpError(400, 'Municipio de cobertura no válido.');
    }
    await db.batch([
      db.prepare('DELETE FROM courier_coverage WHERE user_id=?').bind(user.id),
      ...ids.map((id) => db.prepare('INSERT OR IGNORE INTO courier_coverage(user_id,municipality_id) VALUES(?,?)').bind(user.id, id)),
    ]);
  }

  // Cambio público → evento outbox + proyección (idempotente y versionado).
  await bumpProfileVersion(env, user.id);
  await syncProjection(env, user.id).catch(() => null);
  return { ok: true };
}

// ─── GET /courier/me/reviews ────────────────────────────────────────────────
export async function courierReviews(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const { db } = await requireCourierShard(env, user.id);

  const rows = await db
    .prepare('SELECT * FROM reviews WHERE courier_id=? ORDER BY created_at DESC')
    .bind(user.id)
    .all();
  const authorIds = [...new Set(((rows.results ?? []) as Array<Record<string, unknown>>).map((r) => r.author_id as string))];
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const accs = await env.D1_CORE
      .prepare(`SELECT user_id, full_name FROM account_profiles WHERE user_id IN (${authorIds.map(() => '?').join(',')})`)
      .bind(...authorIds)
      .all();
    for (const a of (accs.results ?? []) as Array<{ user_id: string; full_name: string }>) authorNames.set(a.user_id, a.full_name);
  }

  const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  const reviews: Array<Record<string, unknown>> = [];
  for (const r of (rows.results ?? []) as Array<Record<string, unknown>>) {
    const key = String(r.rating);
    if (key in distribution) distribution[key] += 1;
    reviews.push(
      toReviewDto(
        {
          id: r.id as string,
          rating: r.rating as number,
          comment: r.comment as string,
          isVerified: r.is_verified as number,
          response: (r.response as string | null) ?? null,
          createdAt: r.created_at as number,
        },
        authorNames.get(r.author_id as string) ?? 'Usuario MENRUT',
      ),
    );
  }
  return { reviews, distribution };
}

// ─── GET /courier/me/wallet ─────────────────────────────────────────────────
export async function courierWallet(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  const { profile } = await requireCourierShard(env, user.id);

  const wallet = await getWallet(env, user.id);
  const membership = await activeMembership(env, user.id);
  const txs = await ledgerTransactions(env, user.id);
  return toWalletDto(wallet, membership, profile.visible === 1, txs);
}

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
