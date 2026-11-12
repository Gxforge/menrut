// MENRUT v2 — Endpoints públicos: territorios, búsqueda (SOLO proyección de
// CORE, sin fanout), pasaporte (proyección + shard dueño), planes,
// herramientas, rutas populares y reseñas. La búsqueda puede llevar sesión
// opcional para marcar favoritos.
import {
  asBool,
  asInt,
  asString,
  checkRate,
  COVERAGE_TYPES,
  HttpError,
  newId,
  nowMs,
  verifySupabaseToken,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { assignedShard } from './shard';
import { syncProjection } from './shard';

import { computeMatch, sortMatches, toSearchItem, VISIBLE_ROUTE_STATUSES, type SearchProfile } from './matching';
import type { RouteProjectionItem as RoutePayload } from './shard';

// ─── GET /territories ───────────────────────────────────────────────────────
export async function territories(env: V2Env): Promise<Record<string, unknown>> {
  const provinces = await env.D1_CORE.prepare('SELECT id, name FROM Province ORDER BY sortOrder ASC, name ASC').all();
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

// ─── Carga de la proyección pública (búsqueda nacional sin fanout) ──────────
function parseRoutesJson(routesJson: string | null): RoutePayload[] {
  if (!routesJson) return [];
  try {
    const parsed = JSON.parse(routesJson) as Array<Record<string, unknown>>;
    return parsed.map((r) => ({
      originMunicipalityId: (r.originMunicipalityId as string) ?? (r.origin_id as string) ?? null,
      destinationMunicipalityId: (r.destinationMunicipalityId as string) ?? (r.destination_id as string) ?? null,
      originProvinceId: (r.originProvinceId as string) ?? (r.origin_province_id as string) ?? null,
      destinationProvinceId: (r.destinationProvinceId as string) ?? (r.destination_province_id as string) ?? null,
      scope: (r.scope as string) ?? 'municipal',
      stops: (r.stops as string) ?? '',
      frequency: (r.frequency as string) ?? '',
      daysNote: (r.daysNote as string) ?? '',
      serviceType: (r.serviceType as string) ?? 'paquetes',
      vehicleType: (r.vehicleType as string) ?? 'motor',
      feeCup: (r.feeCup as number) ?? null,
      status: (r.status as string) ?? 'active',
      nextDepartureAt: (r.nextDepartureAt as number) ?? null,
      notes: (r.notes as string) ?? '',
    }));
  } catch {
    return [];
  }
}

export async function loadPublicProfiles(env: V2Env): Promise<SearchProfile[]> {
  const rows = await env.D1_CORE
    .prepare(
      `SELECT d.*, p.avatar_path AS avatarUrl FROM public_courier_directory d
       LEFT JOIN account_profiles p ON p.user_id = d.user_id
       JOIN global_accounts g ON g.user_id = d.user_id
       WHERE g.status='active' AND d.visible=1 AND d.expires_at>unixepoch()`
    )
    .all();
  const namesById = await municipalityNames(env);
  return ((rows.results ?? []) as Array<Record<string, unknown>>).map((d) => ({
    courierId: d.user_id as string,
    userId: d.user_id as string,
    fullName: (d.name as string) ?? 'Mensajero',
    avatarUrl: (d.avatarUrl as string | null) ?? null,
    verificationStatus: d.is_verified === 1 ? 'verified' : 'unverified',
    ratingAvg: (d.review_count as number) > 0 ? (d.rating_sum as number) / (d.review_count as number) : 0,
    ratingCount: d.review_count as number,
    verifiedDeliveries: d.verified_deliveries as number,
    baseFeeCup: (d.base_fee_cup as number | null) ?? null,
    availabilityNote: (d.availability_note as string) ?? '',
    vehicleSummary: (d.vehicle_summary as string) ?? '',
    coverageType: (d.coverage_type as string) ?? 'municipal',
    municipalityId: (d.municipality_id as string | null) ?? null,
    isDemo: (d.is_demo as number) ?? 0,
    highlightedUntil: (d.highlighted_until as number) ?? 0,
    services: ((d.services_csv as string) ?? '').split(',').filter(Boolean),
    coverage: ((d.coverage_csv as string) ?? '')
      .split(',')
      .filter(Boolean)
      .map((id) => ({ municipalityId: id, name: namesById.get(id) ?? id })),
    routes: parseRoutesJson(d.routes_json as string),
  }));
}

export async function municipalityNames(env: V2Env): Promise<Map<string, string>> {
  const rows = await env.D1_CORE.prepare('SELECT id, name FROM Municipality').all();
  return new Map(((rows.results ?? []) as Array<{ id: string; name: string }>).map((m) => [m.id, m.name]));
}

// ─── GET /search ────────────────────────────────────────────────────────────
export async function search(request: Request, env: V2Env, url: URL): Promise<Record<string, unknown>> {
  const sp = url.searchParams;
  const originId = asString(sp.get('origin')) || null;
  const destinationId = asString(sp.get('destination')) || null;
  const routeMode = asString(sp.get('routeMode')) ?? 'any';
  const serviceType = asString(sp.get('serviceType')) ?? 'any';
  const vehicle = asString(sp.get('vehicle')) ?? 'any';
  const coverageType = asString(sp.get('coverageType')) ?? 'any';
  const minRatingRaw = asString(sp.get('minRating'));
  const minRating =
    minRatingRaw !== null && minRatingRaw !== '' && Number.isFinite(Number(minRatingRaw)) ? Number(minRatingRaw) : null;
  const maxFeeRaw = asString(sp.get('maxFee'));
  const maxFee = maxFeeRaw !== null && maxFeeRaw !== '' && Number.isFinite(Number(maxFeeRaw)) ? Number(maxFeeRaw) : null;
  const onlyVerified = asBool(sp.get('onlyVerified')) ?? false;
  const sort = asString(sp.get('sort')) ?? 'relevance';

  const identity = await verifySupabaseToken(request, env);
  let favoriteIds = new Set<string>();
  if (identity) {
    const favs = await env.D1_CORE
      .prepare('SELECT courier_id FROM favorites WHERE user_id=?')
      .bind(identity.sub)
      .all();
    favoriteIds = new Set(((favs.results ?? []) as Array<{ courier_id: string }>).map((f) => f.courier_id));
  }

  let base = await loadPublicProfiles(env);
  if (serviceType !== 'any') base = base.filter((p) => p.services.includes(serviceType));
  if (vehicle !== 'any') {
    base = base.filter((p) => p.routes.some((r) => r.vehicleType === vehicle) || vehicleHint(p.vehicleSummary, vehicle));
  }
  if ((COVERAGE_TYPES as readonly string[]).includes(coverageType)) {
    base = base.filter((p) => p.coverageType === coverageType);
  }
  if (minRating !== null) base = base.filter((p) => p.ratingAvg >= minRating);
  if (maxFee !== null) base = base.filter((p) => p.baseFeeCup !== null && p.baseFeeCup <= maxFee);
  if (onlyVerified) base = base.filter((p) => p.verificationStatus === 'verified');

  const now = nowMs();
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
    if (wantedIds.some((id) => !munById.has(id))) return { results: [], alternatives: [] };

    const matches = [];
    for (const p of base) {
      const match = computeMatch(
        p,
        originId,
        destinationId,
        originId ? munById.get(originId)?.name ?? null : null,
        destinationId ? munById.get(destinationId)?.name ?? null : null,
        originId ? munById.get(originId)?.provinceId ?? null : null,
        destinationId ? munById.get(destinationId)?.provinceId ?? null : null,
        now,
      );
      if (match.tier === 3) continue;
      if (routeMode === 'full' && match.tier !== 0) continue;
      if (routeMode === 'partial' && match.tier > 1) continue;
      matches.push({
        item: toSearchItem(p, match.reasons, match.nextDepartureAt, favoriteIds.has(p.courierId)),
        tier: match.tier,
        verifiedRank: p.verificationStatus === 'verified' ? 0 : 1,
      });
    }
    const results = sortMatches(matches, sort).map((m) => m.item);

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

  const directory = [...base]
    .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    .slice(0, 10)
    .map((p) => toSearchItem(p, [], null, favoriteIds.has(p.courierId)));
  return { results: directory, alternatives: [] };
}

function vehicleHint(summary: string, vehicle: string): boolean {
  const hints: Record<string, string[]> = {
    motor: ['motor', 'moto'],
    auto: ['auto', 'carro'],
    panel: ['panel'],
    camion: ['camión', 'camion'],
    bicielectrica: ['bici'],
  };
  const lower = summary.toLowerCase();
  return (hints[vehicle] ?? []).some((h) => lower.includes(h));
}
