// MENRUT v2 — Endpoints del mensajero: dashboard, perfil profesional, rutas,
// reputación, cartera, membresía y verificación de identidad.
import {
  asInt,
  asString,
  checkRate,
  CONTACT_PREFERENCES,
  COVERAGE_TYPES,
  HttpError,
  newId,
  nowMs,
  requireAuth,
  requireExactRole,
  SERVICE_TYPES,
  type V2Env,
} from './core';
import { ROUTE_SELECT, toRouteDto, toWalletDto, toReviewDto, type RouteRow } from './dto';
import { assertNoDuplicateActiveRoute, parseRoutePayload, ZONE_NO_ROUTES_MESSAGE } from './route-payload';
import { activateTrialPlan, getActiveMembership, getWallet, reconcileWallet, requireCourierProfile } from './wallet';

// ─── GET /courier/me ────────────────────────────────────────────────────────
export async function courierDashboard(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);

  // Reconciliación lazy de permanencia antes de exponer saldos.
  await reconcileWallet(env, profile.id);
  const wallet = await getWallet(env, profile.id);
  const membership = await getActiveMembership(env, profile.id);
  const fresh = await db.prepare('SELECT isPublic, verificationStatus, coverageType, ratingAvg, ratingCount, verifiedDeliveries FROM CourierProfile WHERE id=?').bind(profile.id).first();

  const countRoutes = async (status: string) =>
    (await db.prepare("SELECT COUNT(*) AS n FROM Route WHERE courierId=? AND status=?").bind(profile.id, status).first<{ n: number }>())?.n ?? 0;

  return {
    isPublic: !!fresh?.isPublic,
    verificationStatus: fresh?.verificationStatus ?? 'unverified',
    coverageType: fresh?.coverageType ?? 'municipal',
    ratingAvg: fresh?.ratingAvg ?? 0,
    ratingCount: fresh?.ratingCount ?? 0,
    verifiedDeliveries: fresh?.verifiedDeliveries ?? 0,
    activeRoutes: await countRoutes('active'),
    scheduledRoutes: await countRoutes('scheduled'),
    pausedRoutes: await countRoutes('paused'),
    wallet: {
      permanenceCredits: wallet?.permanenceCredits ?? 0,
      toolCredits: wallet?.toolCredits ?? 0,
      hasActiveMembership: !!membership,
      planName: membership?.planName ?? null,
      planExpiresAt: membership ? new Date(membership.expiresAt).toISOString() : null,
    },
    courierId: profile.id,
    hasUsedTrial: !!user.hasUsedTrial,
  };
}

// ─── PATCH /courier/me ──────────────────────────────────────────────────────
export async function updateCourierProfile(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);

  const patch: string[] = [];
  const values: unknown[] = [];
  if ('bio' in body) {
    const bio = asString(body.bio) ?? '';
    if (bio.length > 600) throw new HttpError(400, 'La biografía es demasiado larga (máx. 600).');
    patch.push('bio=?');
    values.push(bio.trim());
  }
  if ('yearsExperience' in body) {
    const years = asInt(body.yearsExperience);
    if (years === null || years < 0 || years > 60) {
      throw new HttpError(400, 'Los años de experiencia deben estar entre 0 y 60.');
    }
    patch.push('yearsExperience=?');
    values.push(years);
  }
  if ('vehicleSummary' in body) {
    const v = asString(body.vehicleSummary) ?? '';
    if (v.length > 120) throw new HttpError(400, 'El resumen de vehículo es demasiado largo.');
    patch.push('vehicleSummary=?');
    values.push(v.trim());
  }
  if ('availabilityNote' in body) {
    const a = asString(body.availabilityNote) ?? '';
    if (a.length > 200) throw new HttpError(400, 'La nota de disponibilidad es demasiado larga.');
    patch.push('availabilityNote=?');
    values.push(a.trim());
  }
  if ('baseFeeCup' in body) {
    if (body.baseFeeCup === null || body.baseFeeCup === '') {
      patch.push('baseFeeCup=NULL');
    } else {
      const fee = asInt(body.baseFeeCup);
      if (fee === null || fee < 0) throw new HttpError(400, 'La tarifa base debe ser un número positivo.');
      patch.push('baseFeeCup=?');
      values.push(fee);
    }
  }
  if ('contactPreference' in body) {
    const c = asString(body.contactPreference) ?? '';
    if (!(CONTACT_PREFERENCES as readonly string[]).includes(c)) {
      throw new HttpError(400, 'Preferencia de contacto no válida.');
    }
    patch.push('contactPreference=?');
    values.push(c);
  }
  // Tipo de mensajero: zone | municipal | provincial (corrección del propietario).
  if ('coverageType' in body) {
    const ct = asString(body.coverageType) ?? '';
    if (!(COVERAGE_TYPES as readonly string[]).includes(ct)) {
      throw new HttpError(400, 'Tipo de mensajero no válido (zona, municipal o provincial).');
    }
    patch.push('coverageType=?');
    values.push(ct);
  }

  if (patch.length > 0) {
    values.push(nowMs(), profile.id);
    await db.prepare(`UPDATE CourierProfile SET ${patch.join(',')}, updatedAt=? WHERE id=?`).bind(...values).run();
  }

  // Servicios: reemplazo completo (upsert de nuevos, borrado de quitados).
  if ('services' in body) {
    const raw = body.services;
    if (!Array.isArray(raw)) throw new HttpError(400, 'Formato de servicios no válido.');
    const wanted = [
      ...new Set(
        raw.filter((s): s is string => typeof s === 'string' && (SERVICE_TYPES as readonly string[]).includes(s)),
      ),
    ];
    const stmts: D1PreparedStatement[] = [];
    for (const t of wanted) {
      stmts.push(
        db
          .prepare('INSERT OR IGNORE INTO CourierService(id,courierId,serviceType,note) VALUES(?,?,?,NULL)')
          .bind(newId(), profile.id, t),
      );
    }
    if (wanted.length > 0) {
      const placeholders = wanted.map(() => '?').join(',');
      stmts.push(
        db
          .prepare(`DELETE FROM CourierService WHERE courierId=? AND serviceType NOT IN (${placeholders})`)
          .bind(profile.id, ...wanted),
      );
    } else {
      stmts.push(db.prepare('DELETE FROM CourierService WHERE courierId=?').bind(profile.id));
    }
    await db.batch(stmts);
  }

  return { ok: true };
}

// ─── /courier/me/routes ─────────────────────────────────────────────────────
export async function listCourierRoutes(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const profile = await requireCourierProfile(env, user.id);
  const rows = await env.D1_CORE
    .prepare(`${ROUTE_SELECT} WHERE r.courierId=? ORDER BY r.createdAt DESC`)
    .bind(profile.id)
    .all();
  return { routes: ((rows.results ?? []) as unknown as RouteRow[]).map((r) => toRouteDto(r)) };
}

export async function createCourierRoute(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);
  if (profile.coverageType === 'zone') throw new HttpError(400, ZONE_NO_ROUTES_MESSAGE);

  const payload = await parseRoutePayload(env, body, { partial: false, coverageType: profile.coverageType });

  const isProvincial = payload.scope === 'provincial';
  if (isProvincial) {
    if (!payload.originProvinceId || !payload.destinationProvinceId) {
      throw new HttpError(400, 'Selecciona las provincias de origen y destino.');
    }
    await assertNoDuplicateActiveRoute(env, profile.id, 'provincial', payload.originProvinceId, payload.destinationProvinceId);
  } else {
    if (!payload.originMunicipalityId || !payload.destinationMunicipalityId) {
      throw new HttpError(400, 'Selecciona origen y destino.');
    }
    await assertNoDuplicateActiveRoute(env, profile.id, 'municipal', payload.originMunicipalityId, payload.destinationMunicipalityId);
  }

  const id = newId();
  const now = nowMs();
  await db
    .prepare(
      `INSERT INTO Route(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,
       scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`
    )
    .bind(
      id, profile.id,
      isProvincial ? null : payload.originMunicipalityId,
      isProvincial ? null : payload.destinationMunicipalityId,
      isProvincial ? payload.originProvinceId : null,
      isProvincial ? payload.destinationProvinceId : null,
      payload.scope ?? 'municipal',
      payload.stops ?? '', payload.frequency ?? 'personalizada', payload.daysNote ?? '',
      payload.serviceType ?? 'paquetes', payload.vehicleType ?? 'motor', payload.feeCup ?? null,
      payload.status ?? 'active', payload.nextDepartureAt ?? null, payload.notes ?? '',
      now, now,
    )
    .run();

  const created = (await db.prepare(`${ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(id).first()) as unknown as RouteRow;
  return { route: toRouteDto(created) };
}

async function loadOwnRoute(env: V2Env, userId: string, routeId: string): Promise<{ route: RouteRow; profileId: string; coverageType: string } | null> {
  const profile = await requireCourierProfile(env, userId);
  const route = await env.D1_CORE.prepare(`${ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(routeId).first() as unknown as RouteRow | null;
  if (!route || route.courierId !== profile.id) return null;
  return { route, profileId: profile.id, coverageType: profile.coverageType };
}

export async function updateCourierRoute(request: Request, env: V2Env, routeId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const db = env.D1_CORE;
  const own = await loadOwnRoute(env, user.id, routeId);
  if (!own) throw new HttpError(404, 'Ruta no encontrada.');
  const { route, coverageType } = own;

  const payload = await parseRoutePayload(env, body, { partial: true, coverageType });

  // Origen/destino efectivos tras el parche (según el scope resultante).
  const scope = payload.scope ?? (route.scope as 'municipal' | 'provincial');
  const originMunicipalityId = payload.originMunicipalityId ?? route.originMunicipalityId;
  const destinationMunicipalityId = payload.destinationMunicipalityId ?? route.destinationMunicipalityId;
  const originProvinceId = payload.originProvinceId ?? route.originProvinceId;
  const destinationProvinceId = payload.destinationProvinceId ?? route.destinationProvinceId;
  const territoryChanged =
    (payload.originMunicipalityId !== undefined && payload.originMunicipalityId !== route.originMunicipalityId) ||
    (payload.destinationMunicipalityId !== undefined && payload.destinationMunicipalityId !== route.destinationMunicipalityId) ||
    (payload.originProvinceId !== undefined && payload.originProvinceId !== route.originProvinceId) ||
    (payload.destinationProvinceId !== undefined && payload.destinationProvinceId !== route.destinationProvinceId);
  if (territoryChanged) {
    await assertNoDuplicateActiveRoute(
      env,
      route.courierId,
      scope,
      scope === 'provincial' ? originProvinceId : originMunicipalityId,
      scope === 'provincial' ? destinationProvinceId : destinationMunicipalityId,
      route.id,
    );
  }

  const patch: string[] = [];
  const values: unknown[] = [];
  const apply = (cond: boolean, col: string, val: unknown) => {
    if (cond) {
      patch.push(`${col}=?`);
      values.push(val);
    }
  };
  apply(payload.originMunicipalityId !== undefined, 'originMunicipalityId', payload.originMunicipalityId ?? null);
  apply(payload.destinationMunicipalityId !== undefined, 'destinationMunicipalityId', payload.destinationMunicipalityId ?? null);
  apply(payload.originProvinceId !== undefined, 'originProvinceId', payload.originProvinceId ?? null);
  apply(payload.destinationProvinceId !== undefined, 'destinationProvinceId', payload.destinationProvinceId ?? null);
  apply(payload.scope !== undefined, 'scope', payload.scope);
  apply(payload.stops !== undefined, 'stops', payload.stops);
  apply(payload.frequency !== undefined, 'frequency', payload.frequency);
  apply(payload.daysNote !== undefined, 'daysNote', payload.daysNote);
  apply(payload.serviceType !== undefined, 'serviceType', payload.serviceType);
  apply(payload.vehicleType !== undefined, 'vehicleType', payload.vehicleType);
  apply(payload.feeCup !== undefined, 'feeCup', payload.feeCup ?? null);
  apply(payload.status !== undefined, 'status', payload.status);
  apply(payload.nextDepartureAt !== undefined, 'nextDepartureAt', payload.nextDepartureAt ?? null);
  apply(payload.notes !== undefined, 'notes', payload.notes);

  if (patch.length > 0) {
    values.push(nowMs(), route.id);
    await db.prepare(`UPDATE Route SET ${patch.join(',')}, updatedAt=? WHERE id=?`).bind(...values).run();
  }

  const updated = (await db.prepare(`${ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(route.id).first()) as unknown as RouteRow;
  return { route: toRouteDto(updated) };
}

export async function deleteCourierRoute(request: Request, env: V2Env, routeId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const own = await loadOwnRoute(env, user.id, routeId);
  if (!own) throw new HttpError(404, 'Ruta no encontrada.');
  await env.D1_CORE.prepare('DELETE FROM Route WHERE id=?').bind(routeId).run();
  return { ok: true };
}

// ─── GET /courier/me/reviews ────────────────────────────────────────────────
export async function courierReviews(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const profile = await requireCourierProfile(env, user.id);
  const rows = await env.D1_CORE
    .prepare(
      `SELECT rv.id, rv.rating, rv.comment, rv.isVerified, rv.response, rv.createdAt, u.fullName AS authorName
       FROM Review rv JOIN User u ON u.id=rv.authorId
       WHERE rv.courierId=? ORDER BY rv.createdAt DESC`
    )
    .bind(profile.id)
    .all();
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
          isVerified: r.isVerified as number,
          response: (r.response as string | null) ?? null,
          createdAt: r.createdAt as number,
        },
        r.authorName as string,
      ),
    );
  }
  return { reviews, distribution };
}

// ─── GET /courier/me/wallet ─────────────────────────────────────────────────
export async function courierWallet(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);

  // Reconciliación lazy (regla 8.3): consume créditos por tiempo transcurrido.
  await reconcileWallet(env, profile.id);
  const wallet = await getWallet(env, profile.id);
  const membership = await getActiveMembership(env, profile.id);
  const txs = wallet
    ? ((await db
        .prepare('SELECT * FROM WalletTransaction WHERE walletId=? ORDER BY createdAt DESC LIMIT 20')
        .bind(wallet.id)
        .all()).results ?? []) as Array<{
        id: string;
        walletType: string;
        reason: string;
        reference: string | null;
        delta: number;
        balanceAfter: number;
        createdAt: number;
      }>
    : [];
  const freshProfile = await db.prepare('SELECT isPublic FROM CourierProfile WHERE id=?').bind(profile.id).first<{ isPublic: number }>();
  return toWalletDto(wallet, membership, !!freshProfile?.isPublic, txs);
}

// ─── POST /courier/me/membership ────────────────────────────────────────────
export async function requestMembership(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  await checkRate(env, `membership:${user.id}`, 10, 60_000);
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);

  const planCode = asString(body.planCode)?.trim() ?? '';
  if (!planCode) throw new HttpError(400, 'Selecciona un plan.');
  const plan = await db
    .prepare('SELECT * FROM MembershipPlan WHERE code=? LIMIT 1')
    .bind(planCode)
    .first<{ id: string; name: string; isActive: number; isTrial: number }>();
  if (!plan || !plan.isActive) throw new HttpError(400, 'El plan seleccionado no está disponible.');

  // Prueba gratuita: activación directa, una sola vez por cuenta.
  if (plan.isTrial) {
    if (user.hasUsedTrial) throw new HttpError(409, 'La prueba gratuita ya fue utilizada.');
    await activateTrialPlan(env, user.id, profile.id);
    return { ok: true, status: 'active' };
  }

  const amountCup = asInt(body.amountCup);
  if (amountCup === null || amountCup < 0) throw new HttpError(400, 'El importe debe ser un número entero positivo.');
  const method = asString(body.method)?.trim() ?? '';
  if (!method) throw new HttpError(400, 'Indica el método de pago.');
  const reference = asString(body.reference)?.trim() ?? '';
  if (!reference) throw new HttpError(400, 'Indica la referencia de la transferencia.');
  const proofUrl = asString(body.proofUrl)?.trim() ?? '';
  if (proofUrl.length > 500) throw new HttpError(400, 'La URL del comprobante es demasiado larga.');

  const now = nowMs();
  await db.batch([
    db
      .prepare(
        "INSERT INTO PaymentProof(id,courierId,submittedBy,planId,amountCup,confirmedAmountCup,method,reference,proofUrl,status,createdAt) VALUES(?,?,?,?,?,NULL,?,?,?,'pending',?)"
      )
      .bind(newId(), profile.id, user.id, plan.id, amountCup, method, reference, proofUrl, now),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Comprobante recibido',?,NULL,?)"
      )
      .bind(newId(), user.id, 'membresia', `Tu pago del plan ${plan.name} está en revisión. Te avisaremos en cuanto se apruebe.`, now),
  ]);
  return { ok: true, status: 'pending' };
}

// ─── POST /courier/me/verification ──────────────────────────────────────────
export async function submitVerification(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user, 'courier');
  await checkRate(env, `verification:${user.id}`, 5, 60 * 60_000);
  const db = env.D1_CORE;
  const profile = await requireCourierProfile(env, user.id);

  const current = await db
    .prepare('SELECT verificationStatus FROM CourierProfile WHERE id=?')
    .bind(profile.id)
    .first<{ verificationStatus: string }>();
  if (current?.verificationStatus === 'verified') throw new HttpError(400, 'Tu cuenta ya está verificada.');
  const pending = await db
    .prepare("SELECT id FROM VerificationRequest WHERE courierId=? AND status='pending' LIMIT 1")
    .bind(profile.id)
    .first<{ id: string }>();
  if (pending) throw new HttpError(409, 'Ya tienes una solicitud de verificación en revisión.');

  const note = asString(body.note)?.trim() ?? '';
  if (note.length < 10 || note.length > 500) {
    throw new HttpError(400, 'Explica brevemente tu actividad (entre 10 y 500 caracteres).');
  }
  const documentUrl = asString(body.documentUrl)?.trim() ?? '';
  if (documentUrl.length > 500) throw new HttpError(400, 'La URL del documento es demasiado larga.');

  const now = nowMs();
  await db.batch([
    db
      .prepare(
        "INSERT INTO VerificationRequest(id,courierId,documentUrl,note,status,createdAt) VALUES(?,?,?,?,'pending',?)"
      )
      .bind(newId(), profile.id, documentUrl, note, now),
    db.prepare('UPDATE CourierProfile SET verificationStatus=?, updatedAt=? WHERE id=?').bind('pending', now, profile.id),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Solicitud enviada',?,NULL,?)"
      )
      .bind(newId(), user.id, 'admin', 'Tu solicitud de verificación está en revisión. Te notificaremos el resultado.', now),
  ]);
  return { ok: true };
}
