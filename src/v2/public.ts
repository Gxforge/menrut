// MENRUT v2 — Endpoints públicos: territorios, búsqueda, pasaporte, planes,
// herramientas y rutas populares. Sin sesión (la búsqueda puede usar sesión
// opcional para marcar favoritos).
import { asBool, asString, COVERAGE_TYPES, HttpError, nowMs, verifySupabaseToken, type V2Env } from './core';
import { ROUTE_SELECT, toRouteDto, type PlanRow, toPlanDto, planTier, toReviewDto, toToolDto, type RouteRow } from './dto';

const VISIBLE_ROUTE_STATUSES = ['active', 'scheduled'];

// Etiquetas de texto libre que sugieren cada tipo de vehículo en vehicleSummary.
const VEHICLE_HINTS: Record<string, string[]> = {
  motor: ['motor', 'moto'],
  auto: ['auto', 'carro'],
  panel: ['panel'],
  camion: ['camión', 'camion'],
  bicielectrica: ['bici'],
};

interface SearchProfile {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  verificationStatus: string;
  ratingAvg: number;
  ratingCount: number;
  verifiedDeliveries: number;
  baseFeeCup: number | null;
  availabilityNote: string;
  vehicleSummary: string;
  coverageType: string;
  isDemo: number;
  services: string[];
  coverage: Array<{ municipalityId: string; name: string }>;
  routes: RouteRow[];
}

function parseStops(stops: string): string[] {
  return stops
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function vehicleMatches(p: SearchProfile, vehicle: string): boolean {
  if (p.routes.some((r) => r.vehicleType === vehicle)) return true;
  const hints = VEHICLE_HINTS[vehicle] ?? [];
  const summary = p.vehicleSummary.toLowerCase();
  return hints.some((h) => summary.includes(h));
}

interface MatchResult {
  reasons: string[];
  tier: 0 | 1 | 2 | 3; // 0 exacta · 1 parcial · 2 cobertura · 3 sin match
  nextDepartureAt: number | null;
}

function computeMatch(
  p: SearchProfile,
  originId: string | null,
  destinationId: string | null,
  originName: string | null,
  destinationName: string | null,
  originProvinceId: string | null,
  destinationProvinceId: string | null,
): MatchResult {
  const reasons: string[] = [];
  let exact = false;
  let partial = false;
  let covered = false;
  let nextDeparture: number | null = null;

  const visibleRoutes = p.routes.filter((r) => VISIBLE_ROUTE_STATUSES.includes(r.status));

  for (const r of visibleRoutes) {
    const fwd = !!(
      originId &&
      destinationId &&
      ((r.originMunicipalityId === originId && r.destinationMunicipalityId === destinationId) ||
        (r.originProvinceId &&
          r.destinationProvinceId &&
          originProvinceId &&
          destinationProvinceId &&
          r.originProvinceId === originProvinceId &&
          r.destinationProvinceId === destinationProvinceId))
    );
    const bwd = !!(
      originId &&
      destinationId &&
      ((r.originMunicipalityId === destinationId && r.destinationMunicipalityId === originId) ||
        (r.originProvinceId &&
          r.destinationProvinceId &&
          originProvinceId &&
          destinationProvinceId &&
          r.originProvinceId === destinationProvinceId &&
          r.destinationProvinceId === originProvinceId))
    );
    if (fwd || bwd) {
      exact = true;
      if (!reasons.includes('Cubre tu ruta')) reasons.push('Cubre tu ruta');
      if (r.frequency === 'diaria' && !reasons.includes('Ruta frecuente')) reasons.push('Ruta frecuente');
    }
    if (r.nextDepartureAt && r.nextDepartureAt > nowMs()) {
      if (!nextDeparture || r.nextDepartureAt < nextDeparture) nextDeparture = r.nextDepartureAt;
    }
  }

  if (!exact) {
    for (const r of visibleRoutes) {
      const stops = parseStops(r.stops);
      const hasOrigin =
        !!originId &&
        (r.originMunicipalityId === originId ||
          r.destinationMunicipalityId === originId ||
          (!!r.originProvinceId && !!originProvinceId && r.originProvinceId === originProvinceId) ||
          (!!r.destinationProvinceId && !!originProvinceId && r.destinationProvinceId === originProvinceId));
      const hasDestination =
        !!destinationId &&
        (r.originMunicipalityId === destinationId ||
          r.destinationMunicipalityId === destinationId ||
          (!!r.originProvinceId && !!destinationProvinceId && r.originProvinceId === destinationProvinceId) ||
          (!!r.destinationProvinceId &&
            !!destinationProvinceId &&
            r.destinationProvinceId === destinationProvinceId));
      const originInStops = !!originName && stops.includes(originName.toLowerCase());
      const destinationInStops = !!destinationName && stops.includes(destinationName.toLowerCase());
      const touches = hasOrigin || hasDestination || originInStops || destinationInStops;
      if (touches && (!hasOrigin || !hasDestination)) {
        partial = true;
        if (!reasons.includes('Ruta parcial')) reasons.push('Ruta parcial');
        break;
      }
    }
  }

  if (originId || destinationId) {
    if (
      (originId && p.coverage.some((c) => c.municipalityId === originId)) ||
      (destinationId && p.coverage.some((c) => c.municipalityId === destinationId))
    ) {
      covered = true;
      if (!reasons.includes('Cobertura en tu municipio')) reasons.push('Cobertura en tu municipio');
    }
    if (nextDeparture && !reasons.includes('Próximo recorrido')) reasons.push('Próximo recorrido');
  }

  const tier: MatchResult['tier'] = exact ? 0 : partial ? 1 : covered ? 2 : 3;
  return { reasons, tier, nextDepartureAt: nextDeparture };
}

function toSearchItem(
  p: SearchProfile,
  reasons: string[],
  nextDepartureAt: number | null,
  isFavorite: boolean,
): Record<string, unknown> {
  return {
    courierId: p.id,
    userId: p.userId,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    isVerified: p.verificationStatus === 'verified',
    isFavorite,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    verifiedDeliveries: p.verifiedDeliveries,
    vehicleSummary: p.vehicleSummary,
    availabilityNote: p.availabilityNote,
    feeCup: p.baseFeeCup,
    isDemo: !!p.isDemo,
    coverageType: p.coverageType,
    matchReasons: reasons,
    coverage: p.coverage.map((c) => c.name),
    nextDepartureAt: nextDepartureAt ? new Date(nextDepartureAt).toISOString() : null,
  };
}

/** Carga todos los perfiles públicos con sus relaciones (chunks por límite D1). */
async function loadPublicProfiles(env: V2Env): Promise<SearchProfile[]> {
  const db = env.D1_CORE;
  const rows = await db
    .prepare(
      `SELECT p.id, p.userId, p.verificationStatus, p.ratingAvg, p.ratingCount,
       p.verifiedDeliveries, p.baseFeeCup, p.availabilityNote, p.vehicleSummary,
       p.coverageType, p.isDemo, u.fullName, u.avatarUrl
       FROM CourierProfile p JOIN User u ON u.id = p.userId
       WHERE p.isPublic=1 AND u.status='active'`
    )
    .all();
  const profiles: SearchProfile[] = (rows.results ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.userId as string,
    fullName: r.fullName as string,
    avatarUrl: (r.avatarUrl as string | null) ?? null,
    verificationStatus: r.verificationStatus as string,
    ratingAvg: r.ratingAvg as number,
    ratingCount: r.ratingCount as number,
    verifiedDeliveries: r.verifiedDeliveries as number,
    baseFeeCup: (r.baseFeeCup as number | null) ?? null,
    availabilityNote: r.availabilityNote as string,
    vehicleSummary: r.vehicleSummary as string,
    coverageType: r.coverageType as string,
    isDemo: (r.isDemo as number) ?? 0,
    services: [],
    coverage: [],
    routes: [],
  }));
  if (profiles.length === 0) return profiles;

  const ids = profiles.map((p) => p.id);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const placeholders = chunk.map(() => '?').join(',');
    const services = await db
      .prepare(`SELECT courierId, serviceType FROM CourierService WHERE courierId IN (${placeholders})`)
      .bind(...chunk)
      .all();
    for (const s of (services.results ?? []) as Array<Record<string, unknown>>) {
      byId.get(s.courierId as string)?.services.push(s.serviceType as string);
    }
    const coverage = await db
      .prepare(
        `SELECT cc.courierId, cc.municipalityId, m.name FROM CourierCoverage cc
         JOIN Municipality m ON m.id = cc.municipalityId WHERE cc.courierId IN (${placeholders})`
      )
      .bind(...chunk)
      .all();
    for (const c of (coverage.results ?? []) as Array<Record<string, unknown>>) {
      byId.get(c.courierId as string)?.coverage.push({
        municipalityId: c.municipalityId as string,
        name: c.name as string,
      });
    }
    const routes = await db
      .prepare(`${ROUTE_SELECT} WHERE r.courierId IN (${placeholders})`)
      .bind(...chunk)
      .all();
    for (const r of (routes.results ?? []) as unknown as RouteRow[]) {
      byId.get(r.courierId)?.routes.push(r);
    }
  }
  return profiles;
}

// ─── GET /territories ───────────────────────────────────────────────────────
export async function territories(env: V2Env): Promise<Record<string, unknown>> {
  const provinces = await env.D1_CORE
    .prepare('SELECT id, name FROM Province ORDER BY sortOrder ASC, name ASC')
    .all();
  const municipalities = await env.D1_CORE
    .prepare('SELECT id, provinceId, name FROM Municipality ORDER BY name ASC')
    .all();
  const byProvince = new Map<string, Array<{ id: string; name: string }>>();
  for (const m of (municipalities.results ?? []) as Array<Record<string, unknown>>) {
    const list = byProvince.get(m.provinceId as string) ?? [];
    list.push({ id: m.id as string, name: m.name as string });
    byProvince.set(m.provinceId as string, list);
  }
  return {
    provinces: ((provinces.results ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: p.id,
      name: p.name,
      municipalities: byProvince.get(p.id as string) ?? [],
    })),
  };
}

// ─── GET /search ────────────────────────────────────────────────────────────
export async function search(
  request: Request,
  env: V2Env,
  url: URL,
): Promise<Record<string, unknown>> {
  const sp = url.searchParams;
  const originId = asString(sp.get('origin')) || null;
  const destinationId = asString(sp.get('destination')) || null;
  const routeMode = asString(sp.get('routeMode')) ?? 'any';
  const serviceType = asString(sp.get('serviceType')) ?? 'any';
  const vehicle = asString(sp.get('vehicle')) ?? 'any';
  const coverageType = asString(sp.get('coverageType')) ?? 'any';
  const minRatingRaw = asString(sp.get('minRating'));
  const minRating =
    minRatingRaw !== null && minRatingRaw !== '' && Number.isFinite(Number(minRatingRaw))
      ? Number(minRatingRaw)
      : null;
  const maxFeeRaw = asString(sp.get('maxFee'));
  const maxFee =
    maxFeeRaw !== null && maxFeeRaw !== '' && Number.isFinite(Number(maxFeeRaw)) ? Number(maxFeeRaw) : null;
  const onlyVerified = asBool(sp.get('onlyVerified')) ?? false;
  const sort = asString(sp.get('sort')) ?? 'relevance';

  // Favoritos reales si llega un token válido (opcional en búsqueda).
  const identity = await verifySupabaseToken(request, env);
  let favoriteIds = new Set<string>();
  if (identity) {
    const db = env.D1_CORE;
    const bySub = await db.prepare('SELECT id FROM User WHERE supabaseUserId=? LIMIT 1').bind(identity.sub).first<{ id: string }>();
    let uid = bySub?.id;
    if (!uid && identity.email) {
      const byEmail = await db.prepare('SELECT id FROM User WHERE email=? LIMIT 1').bind(identity.email).first<{ id: string }>();
      uid = byEmail?.id;
    }
    if (uid) {
      const favs = await db.prepare('SELECT courierId FROM Favorite WHERE userId=?').bind(uid).all();
      favoriteIds = new Set(((favs.results ?? []) as Array<{ courierId: string }>).map((f) => f.courierId));
    }
  }

  let base = await loadPublicProfiles(env);

  if (serviceType && serviceType !== 'any') {
    base = base.filter((p) => p.services.includes(serviceType));
  }
  if (vehicle && vehicle !== 'any') {
    base = base.filter((p) => vehicleMatches(p, vehicle));
  }
  if ((COVERAGE_TYPES as readonly string[]).includes(coverageType)) {
    base = base.filter((p) => p.coverageType === coverageType);
  }
  if (minRating !== null) {
    base = base.filter((p) => p.ratingAvg >= minRating);
  }
  if (maxFee !== null) {
    base = base.filter((p) => p.baseFeeCup !== null && p.baseFeeCup <= maxFee);
  }
  if (onlyVerified) {
    base = base.filter((p) => p.verificationStatus === 'verified');
  }

  const results: Array<Record<string, unknown>> = [];

  if (originId || destinationId) {
    const wantedIds = [originId, destinationId].filter((v): v is string => !!v);
    const munRows = await env.D1_CORE
      .prepare(`SELECT id, provinceId, name FROM Municipality WHERE id IN (${wantedIds.map(() => '?').join(',')})`)
      .bind(...wantedIds)
      .all();
    const munById = new Map(
      ((munRows.results ?? []) as Array<Record<string, unknown>>).map((m) => [
        m.id as string,
        { provinceId: m.provinceId as string, name: m.name as string },
      ]),
    );
    if (wantedIds.some((id) => !munById.has(id))) {
      return { results: [], alternatives: [] };
    }
    const originName = originId ? munById.get(originId)?.name ?? null : null;
    const destinationName = destinationId ? munById.get(destinationId)?.name ?? null : null;
    const originProvinceId = originId ? munById.get(originId)?.provinceId ?? null : null;
    const destinationProvinceId = destinationId ? munById.get(destinationId)?.provinceId ?? null : null;

    const matches: Array<{ item: Record<string, unknown>; tier: number; verifiedRank: number }> = [];
    for (const p of base) {
      const match = computeMatch(
        p,
        originId,
        destinationId,
        originName,
        destinationName,
        originProvinceId,
        destinationProvinceId,
      );
      if (match.tier === 3) continue;
      if (routeMode === 'full' && match.tier !== 0) continue;
      if (routeMode === 'partial' && match.tier > 1) continue;
      matches.push({
        item: toSearchItem(p, match.reasons, match.nextDepartureAt, favoriteIds.has(p.id)),
        tier: match.tier,
        verifiedRank: p.verificationStatus === 'verified' ? 0 : 1,
      });
    }

    matches.sort((a, b) => {
      const ra = a.item.ratingAvg as number;
      const rb = b.item.ratingAvg as number;
      const ca = a.item.ratingCount as number;
      const cb = b.item.ratingCount as number;
      if (sort === 'rating') return rb - ra || cb - ca;
      if (sort === 'availability') {
        const av = ((a.item.availabilityNote as string) ? 0 : 1) - ((b.item.availabilityNote as string) ? 0 : 1);
        if (av !== 0) return av;
        return rb - ra || cb - ca;
      }
      return a.tier - b.tier || a.verifiedRank - b.verifiedRank || rb - ra || cb - ca;
    });
    results.push(...matches.map((m) => m.item));

    // Alternativas: municipios de las mismas provincias con mensajeros reales.
    if (results.length === 0 && originId && destinationId) {
      const originMun = munById.get(originId);
      const destMun = munById.get(destinationId);
      const provinceIds = [...new Set([originMun?.provinceId, destMun?.provinceId].filter((v): v is string => !!v))];
      if (provinceIds.length > 0) {
        const candidates = await env.D1_CORE
          .prepare(
            `SELECT m.id, m.provinceId, m.name, pr.name AS provinceName FROM Municipality m
             JOIN Province pr ON pr.id = m.provinceId
             WHERE m.provinceId IN (${provinceIds.map(() => '?').join(',')}) AND m.id NOT IN (${wantedIds.map(() => '?').join(',')})`
          )
          .bind(...provinceIds, ...wantedIds)
          .all();
        const scored: Array<{ name: string; count: number }> = [];
        for (const m of (candidates.results ?? []) as Array<Record<string, unknown>>) {
          let count = 0;
          for (const p of base) {
            const touch =
              p.routes.some(
                (r) =>
                  VISIBLE_ROUTE_STATUSES.includes(r.status) &&
                  (r.originMunicipalityId === m.id ||
                    r.destinationMunicipalityId === m.id ||
                    r.originProvinceId === m.provinceId ||
                    r.destinationProvinceId === m.provinceId),
              ) || p.coverage.some((c) => c.municipalityId === m.id);
            if (touch) count += 1;
          }
          if (count > 0) scored.push({ name: `${m.provinceName} · ${m.name}`, count });
        }
        scored.sort((a, b) => b.count - a.count);
        return { results, alternatives: scored.slice(0, 3).map((s) => s.name) };
      }
    }
    return { results, alternatives: [] };
  }

  // Modo directorio (sin origen/destino): top por valoración, máx 10.
  const directory = [...base]
    .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    .slice(0, 10)
    .map((p) => toSearchItem(p, [], null, favoriteIds.has(p.id)));
  results.push(...directory);
  return { results, alternatives: [] };
}

// ─── GET /couriers/:id ──────────────────────────────────────────────────────
export async function passport(request: Request, env: V2Env, courierId: string): Promise<Record<string, unknown>> {
  const db = env.D1_CORE;
  const profile = await db
    .prepare(
      `SELECT p.*, u.id AS uid, u.fullName, u.avatarUrl FROM CourierProfile p
       JOIN User u ON u.id = p.userId WHERE p.id=? LIMIT 1`
    )
    .bind(courierId)
    .first();
  if (!profile) throw new HttpError(404, 'Mensajero no encontrado.');

  // Perfil oculto: solo el dueño (o admin) puede verlo.
  const identity = await verifySupabaseToken(request, env);
  let viewer: { id: string; role: string } | null = null;
  if (identity) {
    const bySub = await db.prepare('SELECT id, role FROM User WHERE supabaseUserId=? LIMIT 1').bind(identity.sub).first();
    if (bySub) viewer = bySub as { id: string; role: string };
    else if (identity.email) {
      const byEmail = await db.prepare('SELECT id, role FROM User WHERE email=? LIMIT 1').bind(identity.email).first();
      if (byEmail) viewer = byEmail as { id: string; role: string };
    }
  }
  const isOwner = viewer?.id === (profile.userId as string);
  const isAdmin = viewer?.role === 'admin' || viewer?.role === 'owner';
  if (!profile.isPublic && !isOwner && !isAdmin) {
    throw new HttpError(404, 'Este pasaporte no está disponible públicamente.');
  }

  const services = await db.prepare('SELECT serviceType FROM CourierService WHERE courierId=?').bind(courierId).all();
  const coverage = await db
    .prepare(
      'SELECT m.name FROM CourierCoverage cc JOIN Municipality m ON m.id=cc.municipalityId WHERE cc.courierId=?'
    )
    .bind(courierId)
    .all();
  const routeRows = await db
    .prepare(`${ROUTE_SELECT} WHERE r.courierId=? ORDER BY r.createdAt DESC`)
    .bind(courierId)
    .all();
  const allRoutes = (routeRows.results ?? []) as unknown as RouteRow[];
  const routes = isOwner ? allRoutes : allRoutes.filter((r) => r.status === 'active' || r.status === 'scheduled');

  const reviews = await db
    .prepare(
      `SELECT rv.id, rv.rating, rv.comment, rv.isVerified, rv.response, rv.createdAt, u.fullName AS authorName
       FROM Review rv JOIN User u ON u.id=rv.authorId
       WHERE rv.courierId=? AND rv.status='visible' ORDER BY rv.createdAt DESC LIMIT 20`
    )
    .bind(courierId)
    .all();

  return {
    courierId: profile.id,
    userId: profile.uid,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    isVerified: profile.verificationStatus === 'verified',
    verificationStatus: profile.verificationStatus,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    verifiedDeliveries: profile.verifiedDeliveries,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    vehicleSummary: profile.vehicleSummary,
    availabilityNote: profile.availabilityNote,
    feeCup: profile.baseFeeCup,
    contactPreference: profile.contactPreference,
    coverageType: profile.coverageType,
    services: ((services.results ?? []) as Array<{ serviceType: string }>).map((s) => s.serviceType),
    coverage: ((coverage.results ?? []) as Array<{ name: string }>).map((c) => c.name),
    routes: routes.map((r) => toRouteDto(r)),
    reviews: ((reviews.results ?? []) as Array<Record<string, unknown>>).map((r) =>
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
    ),
    isDemo: !!profile.isDemo,
  };
}

// ─── GET /plans y GET /tools ────────────────────────────────────────────────
const TIER_ORDER: Record<string, number> = { trial: 0, basic: 1, pro: 2, featured: 3 };

export async function plans(env: V2Env): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM MembershipPlan WHERE isActive=1 ORDER BY sortOrder ASC')
    .all();
  const list = (rows.results ?? []) as unknown as PlanRow[];
  const sorted = [...list].sort((a, b) => {
    const ta = TIER_ORDER[planTier(a)];
    const tb = TIER_ORDER[planTier(b)];
    return ta - tb || a.durationDays - b.durationDays || a.priceCup - b.priceCup;
  });
  return { plans: sorted.map(toPlanDto) };
}

export async function tools(env: V2Env): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE.prepare('SELECT * FROM Tool WHERE isActive=1 ORDER BY sortOrder ASC').all();
  return { tools: ((rows.results ?? []) as unknown as Array<Parameters<typeof toToolDto>[0]>).map(toToolDto) };
}

// ─── GET /routes/popular ────────────────────────────────────────────────────
export async function popularRoutes(env: V2Env): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE
    .prepare(
      `SELECT r.id, r.courierId, r.originMunicipalityId, r.destinationMunicipalityId,
       r.originProvinceId, r.destinationProvinceId, r.scope, r.stops, r.frequency, r.daysNote,
       r.serviceType, r.vehicleType, r.feeCup, r.status, r.nextDepartureAt, r.notes, r.isDemo, r.createdAt,
       om.name AS originMunName, dm.name AS destMunName, op.name AS originProvName, dp.name AS destProvName,
       u.fullName AS courierName
       FROM Route r
       JOIN CourierProfile p ON p.id = r.courierId
       JOIN User u ON u.id = p.userId
       LEFT JOIN Municipality om ON om.id = r.originMunicipalityId
       LEFT JOIN Municipality dm ON dm.id = r.destinationMunicipalityId
       LEFT JOIN Province op ON op.id = r.originProvinceId
       LEFT JOIN Province dp ON dp.id = r.destinationProvinceId
       WHERE r.status IN ('active','scheduled') AND p.isPublic=1 AND u.status='active'
       ORDER BY p.ratingAvg DESC, r.createdAt DESC LIMIT 8`
    )
    .all();
  const routes = (rows.results ?? []) as unknown as Array<RouteRow & { courierName: string }>;
  const couriers: Record<string, string> = {};
  for (const r of routes) {
    if (!(r.courierId in couriers)) couriers[r.courierId] = r.courierName;
  }
  return {
    routes: routes.map((r) => toRouteDto(r, r.courierName, r.courierId)),
    couriers,
  };
}
