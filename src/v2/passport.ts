// MENRUT v2 — Pasaporte público (GET /couriers/:id) y reseñas
// (POST /couriers/:id/reviews). Resuelve mensajero+shard en CORE, comprueba
// cuenta/visibilidad/vigencia y consulta UN único shard para el detalle.
import {
  asInt,
  asString,
  checkRate,
  HttpError,
  newId,
  nowMs,
  verifySupabaseToken,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { assignedShard } from './shard';
import { syncProjection } from './shard';
import { verifiedDeliveryFor } from './deliveries';
import { toReviewDto, toRouteDto, SHARD_ROUTE_SELECT, type RouteRow } from './dto';

/** Adjunta nombres de municipios/provincias (catálogo CORE) a las rutas del shard. */
export async function attachRouteNames(env: V2Env, routes: RouteRow[]): Promise<RouteRow[]> {
  const munIds = new Set<string>();
  const provIds = new Set<string>();
  for (const r of routes) {
    if (r.originMunicipalityId) munIds.add(r.originMunicipalityId);
    if (r.destinationMunicipalityId) munIds.add(r.destinationMunicipalityId);
    if (r.originProvinceId) provIds.add(r.originProvinceId);
    if (r.destinationProvinceId) provIds.add(r.destinationProvinceId);
  }
  const names = new Map<string, string>();
  if (munIds.size > 0) {
    const rows = await env.D1_CORE
      .prepare(`SELECT id, name FROM Municipality WHERE id IN (${[...munIds].map(() => '?').join(',')})`)
      .bind(...munIds)
      .all();
    for (const m of (rows.results ?? []) as Array<{ id: string; name: string }>) names.set(m.id, m.name);
  }
  if (provIds.size > 0) {
    const rows = await env.D1_CORE
      .prepare(`SELECT id, name FROM Province WHERE id IN (${[...provIds].map(() => '?').join(',')})`)
      .bind(...provIds)
      .all();
    for (const p of (rows.results ?? []) as Array<{ id: string; name: string }>) names.set(p.id, p.name);
  }
  return routes.map((r) => ({
    ...r,
    originMunName: r.originMunicipalityId ? names.get(r.originMunicipalityId) ?? null : null,
    destMunName: r.destinationMunicipalityId ? names.get(r.destinationMunicipalityId) ?? null : null,
    originProvName: r.originProvinceId ? names.get(r.originProvinceId) ?? null : null,
    destProvName: r.destinationProvinceId ? names.get(r.destinationProvinceId) ?? null : null,
  }));
}

// ─── GET /couriers/:id ──────────────────────────────────────────────────────
export async function passport(request: Request, env: V2Env, courierId: string): Promise<Record<string, unknown>> {
  const db = env.D1_CORE;
  // 1) Resolver en CORE: proyección + shard dueño + cuenta activa.
  const row = await db
    .prepare(
      `SELECT d.*, m.shard_id AS shardId, p.avatar_path AS avatarUrl, g.status
       FROM public_courier_directory d
       JOIN courier_shard_map m ON m.user_id = d.user_id
       JOIN global_accounts g ON g.user_id = d.user_id
       LEFT JOIN account_profiles p ON p.user_id = d.user_id
       WHERE d.user_id=? LIMIT 1`
    )
    .bind(courierId)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Mensajero no encontrado.');

  // 2) Visibilidad: vigencia efectiva filtra el directorio; dueño/admin ven todo.
  const identity = await verifySupabaseToken(request, env);
  let viewerId: string | null = null;
  let viewerRole = 'guest';
  if (identity) {
    const account = await db
      .prepare(
        `SELECT a.user_id, a.status,
         (SELECT role FROM user_roles WHERE user_id=a.user_id ORDER BY 1 LIMIT 1) AS role
         FROM global_accounts a WHERE a.user_id=?`
      )
      .bind(identity.sub)
      .first<{ user_id: string; status: string; role: string | null }>();
    if (account && account.status === 'active') {
      viewerId = account.user_id;
      viewerRole = account.role ?? 'client';
    }
  }
  const isOwner = viewerId === courierId;
  const isStaff = viewerRole === 'admin' || viewerRole === 'owner';
  const visible = (row.visible as number) === 1 && (row.expires_at as number) > Math.floor(nowMs() / 1000);
  if (!visible && !isOwner && !isStaff) {
    throw new HttpError(404, 'Este pasaporte no está disponible públicamente.');
  }

  // 3) Detalle desde UN único shard (el dueño).
  const shard = await assignedShard(env, courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');
  const sdb = shard.db;
  const profile = await sdb
    .prepare(
      `SELECT p.*, w.expires_at, w.permanence_seconds,
       (SELECT IFNULL(GROUP_CONCAT(name), '') FROM courier_services WHERE user_id=p.user_id) AS services_csv,
       (SELECT IFNULL(GROUP_CONCAT(municipality_id), '') FROM courier_coverage WHERE user_id=p.user_id) AS coverage_csv
       FROM courier_profiles p JOIN credit_wallets w USING(user_id) WHERE p.user_id=? LIMIT 1`
    )
    .bind(courierId)
    .first<Record<string, unknown>>();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  const routeRows = ((
    await sdb.prepare(`${SHARD_ROUTE_SELECT} WHERE r.user_id=? ORDER BY r.created_at DESC`).bind(courierId).all()
  ).results ?? []) as unknown as RouteRow[];
  const allRoutes = await attachRouteNames(env, routeRows);
  const routes = isOwner ? allRoutes : allRoutes.filter((r) => r.status === 'active' || r.status === 'scheduled');

  const reviewRows = (
    await sdb
      .prepare(
        "SELECT * FROM reviews WHERE courier_id=? AND status='published' ORDER BY created_at DESC LIMIT 20"
      )
      .bind(courierId)
      .all()
  ).results as Array<Record<string, unknown>>;
  const authorIds = [...new Set(reviewRows.map((r) => r.author_id as string))];
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const accs = await db
      .prepare(`SELECT user_id, full_name FROM account_profiles WHERE user_id IN (${authorIds.map(() => '?').join(',')})`)
      .bind(...authorIds)
      .all();
    for (const a of (accs.results ?? []) as Array<{ user_id: string; full_name: string }>) {
      authorNames.set(a.user_id, a.full_name);
    }
  }

  const coverageIds = ((profile.coverage_csv as string) ?? '').split(',').filter(Boolean);
  const coverageNames: string[] = [];
  if (coverageIds.length > 0) {
    const muns = await db
      .prepare(`SELECT name FROM Municipality WHERE id IN (${coverageIds.map(() => '?').join(',')})`)
      .bind(...coverageIds)
      .all();
    for (const m of (muns.results ?? []) as Array<{ name: string }>) coverageNames.push(m.name);
  }

  return {
    courierId,
    userId: courierId,
    fullName: (row.name as string) ?? 'Mensajero',
    avatarUrl: (row.avatarUrl as string | null) ?? null,
    isVerified: row.is_verified === 1,
    verificationStatus: row.is_verified === 1 ? 'verified' : 'unverified',
    ratingAvg: (row.review_count as number) > 0 ? (row.rating_sum as number) / (row.review_count as number) : 0,
    ratingCount: row.review_count,
    verifiedDeliveries: row.verified_deliveries,
    bio: profile.description,
    yearsExperience: profile.years_experience,
    vehicleSummary: profile.vehicle_summary,
    availabilityNote: profile.availability_note,
    feeCup: profile.base_fee_cup,
    contactPreference: profile.contact_preference,
    coverageType: row.coverage_type,
    services: ((profile.services_csv as string) ?? '').split(',').filter(Boolean),
    coverage: coverageNames,
    routes: routes.map((r) => toRouteDto(r)),
    reviews: reviewRows.map((r) =>
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
    ),
    isDemo: row.is_demo === 1,
  };
}

// ─── POST /couriers/:id/reviews ─────────────────────────────────────────────
// Requiere sesión (usuario normal registrado). Escribe en el shard del
// mensajero, actualiza sus agregados y sincroniza la proyección (rating).
export async function submitReview(request: Request, env: V2Env, courierId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  await checkRate(env, `review:${user.id}`, 10, 60 * 60_000);
  if (user.id === courierId) throw new HttpError(400, 'No puedes valorarte a ti mismo.');

  const rating = asInt(body.rating);
  if (rating === null || rating < 1 || rating > 5) throw new HttpError(400, 'La puntuación debe estar entre 1 y 5.');
  const comment = (asString(body.comment) ?? '').trim().slice(0, 120);

  const shard = await assignedShard(env, courierId);
  if (!shard) throw new HttpError(404, 'Mensajero no encontrado.');
  const sdb = shard.db;

  const profile = await sdb
    .prepare('SELECT user_id, rating_sum, rating_count FROM courier_profiles WHERE user_id=?')
    .bind(courierId)
    .first<{ user_id: string; rating_sum: number; rating_count: number }>();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  // Entrega verificada opcional (OTP): solo cuenta si es del propio autor,
  // de este mensajero y ya confirmada con el código.
  let verificationId: string | null = null;
  const deliveryId = asString(body.deliveryId)?.trim() ?? '';
  if (deliveryId) {
    verificationId = await verifiedDeliveryFor(sdb, courierId, user.id, deliveryId);
    if (!verificationId) throw new HttpError(400, 'La entrega indicada no está verificada a tu nombre.');
  }

  const id = newId();
  const ratingSum = profile.rating_sum + rating;
  const ratingCount = profile.rating_count + 1;
  await sdb.batch([
    sdb
      .prepare(
        `INSERT INTO reviews(id,verification_id,courier_id,author_id,rating,comment,is_verified,status,created_at)
         VALUES(?,?,?,?,?,?,?,'published',?)`
      )
      .bind(id, verificationId, courierId, user.id, rating, comment, verificationId ? 1 : 0, nowMs()),
    sdb
      .prepare('UPDATE courier_profiles SET rating_sum=?, rating_count=?, version=version+1, updated_at=unixepoch() WHERE user_id=?')
      .bind(ratingSum, ratingCount, courierId),
    sdb
      .prepare(
        `INSERT OR IGNORE INTO shard_outbox(id,user_id,version)
         SELECT 'profile:'||user_id||':'||version, user_id, version FROM courier_profiles WHERE user_id=?`
      )
      .bind(courierId),
  ]);
  await syncProjection(env, courierId).catch(() => null);

  return {
    review: toReviewDto(
      { id, rating, comment, isVerified: verificationId ? 1 : 0, response: null, createdAt: nowMs() },
      user.fullName,
    ),
    ratingAvg: ratingCount > 0 ? ratingSum / ratingCount : 0,
    ratingCount,
  };
}
