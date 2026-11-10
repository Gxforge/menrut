// MENRUT v2 — Catálogos públicos: planes (precios aprobados), herramientas y
// rutas populares (derivadas de la proyección, sin fanout a shards).
import type { V2Env } from './core';
import { toPlanDto, toRouteDto, toToolDto, type PlanRow, type RouteRow, type ToolRow } from './dto';
import { loadPublicProfiles, municipalityNames } from './public';
import { VISIBLE_ROUTE_STATUSES, type SearchProfile } from './matching';

// ─── GET /plans y GET /tools ────────────────────────────────────────────────
export async function plans(env: V2Env): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE.prepare('SELECT * FROM MembershipPlan WHERE isActive=1 ORDER BY sortOrder ASC').all();
  const list = (rows.results ?? []) as unknown as PlanRow[];
  const tierOrder = (code: string, isTrial: number): number => {
    if (isTrial) return 0;
    if (code.startsWith('featured-')) return 3;
    if (code.startsWith('pro-')) return 2;
    return 1;
  };
  const sorted = [...list].sort(
    (a, b) => tierOrder(a.code, a.isTrial) - tierOrder(b.code, b.isTrial) || a.durationDays - b.durationDays || a.priceCup - b.priceCup,
  );
  return { plans: sorted.map(toPlanDto) };
}

export async function tools(env: V2Env): Promise<Record<string, unknown>> {
  const rows = await env.D1_CORE.prepare('SELECT * FROM Tool WHERE isActive=1 ORDER BY sortOrder ASC').all();
  return { tools: ((rows.results ?? []) as unknown as Array<Parameters<typeof toToolDto>[0]>).map(toToolDto) };
}

// ─── GET /routes/popular (derivado de la proyección, sin fanout) ────────────
export async function popularRoutes(env: V2Env): Promise<Record<string, unknown>> {
  const profiles = await loadPublicProfiles(env);
  const namesById = await municipalityNames(env);
  const provinceNames = await env.D1_CORE.prepare('SELECT id, name FROM Province').all();
  const provNames = new Map(((provinceNames.results ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));

  const flat: Array<{ item: Record<string, unknown>; rating: number; createdAt: number }> = [];
  for (const p of profiles) {
    const routes = p.routes.filter((r) => VISIBLE_ROUTE_STATUSES.includes(r.status));
    if (routes.length === 0) continue;
    const row: RouteRow = {
      id: `${p.courierId}`,
      courierId: p.courierId,
      originMunicipalityId: null,
      destinationMunicipalityId: null,
      originProvinceId: null,
      destinationProvinceId: null,
      scope: 'municipal',
      stops: '',
      frequency: '',
      daysNote: '',
      serviceType: '',
      vehicleType: '',
      feeCup: null,
      status: 'active',
      nextDepartureAt: null,
      notes: '',
      isDemo: p.isDemo,
      createdAt: 0,
      originMunName: null,
      destMunName: null,
      originProvName: null,
      destProvName: null,
    };
    for (const r of routes.slice(0, 3)) {
      flat.push({
        item: toRouteDto(
          {
            ...row,
            originMunicipalityId: r.originMunicipalityId,
            destinationMunicipalityId: r.destinationMunicipalityId,
            originProvinceId: r.originProvinceId,
            destinationProvinceId: r.destinationProvinceId,
            scope: r.scope,
            stops: r.stops,
            frequency: r.frequency,
            daysNote: r.daysNote,
            serviceType: r.serviceType,
            vehicleType: r.vehicleType,
            feeCup: r.feeCup,
            nextDepartureAt: r.nextDepartureAt,
            originMunName: r.originMunicipalityId ? namesById.get(r.originMunicipalityId) ?? null : null,
            destMunName: r.destinationMunicipalityId ? namesById.get(r.destinationMunicipalityId) ?? null : null,
            originProvName: r.originProvinceId ? provNames.get(r.originProvinceId) ?? null : null,
            destProvName: r.destinationProvinceId ? provNames.get(r.destinationProvinceId) ?? null : null,
          },
          p.fullName,
          p.courierId,
        ),
        rating: p.ratingAvg,
        createdAt: 0,
      });
    }
  }
  flat.sort((a, b) => b.rating - a.rating);
  const top = flat.slice(0, 8);
  const couriers: Record<string, string> = {};
  for (const f of top) {
    const cid = f.item.courierId as string;
    if (!(cid in couriers)) couriers[cid] = f.item.courierName as string;
  }
  return { routes: top.map((f) => f.item), couriers };
}
