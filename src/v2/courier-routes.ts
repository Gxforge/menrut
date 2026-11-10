// MENRUT v2 — Rutas del mensajero (CRUD en su shard dueño). La validación de
// payloads (route-payload.ts) es la misma del contrato: zona sin rutas,
// municipal por municipios, provincial por provincias.
import { HttpError, newId, nowMs, type V2Env } from './core';
import { requireAuth } from './identity';
import { requireCourierShard } from './courier';
import { SHARD_ROUTE_SELECT, toRouteDto, type RouteRow } from './dto';
import { assertNoDuplicateActiveRoute, parseRoutePayload, ZONE_NO_ROUTES_MESSAGE } from './route-payload';
import { attachRouteNames } from './passport';

export async function listCourierRoutes(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const { db } = await requireCourierShard(env, user.id);
  const rows = (
    (await db.prepare(`${SHARD_ROUTE_SELECT} WHERE r.user_id=? ORDER BY r.created_at DESC`).bind(user.id).all())
      .results ?? []
  ) as unknown as RouteRow[];
  const named = await attachRouteNames(env, rows);
  return { routes: named.map((r) => toRouteDto(r)) };
}

export async function createCourierRoute(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const { db, profile } = await requireCourierShard(env, user.id);
  if (profile.coverage_type === 'zone') throw new HttpError(400, ZONE_NO_ROUTES_MESSAGE);

  const payload = await parseRoutePayload(env, body, { partial: false, coverageType: profile.coverage_type as string });

  const isProvincial = payload.scope === 'provincial';
  if (isProvincial) {
    if (!payload.originProvinceId || !payload.destinationProvinceId) {
      throw new HttpError(400, 'Selecciona las provincias de origen y destino.');
    }
    await assertNoDuplicateActiveRoute(env, db, user.id, 'provincial', payload.originProvinceId, payload.destinationProvinceId);
  } else {
    if (!payload.originMunicipalityId || !payload.destinationMunicipalityId) {
      throw new HttpError(400, 'Selecciona origen y destino.');
    }
    await assertNoDuplicateActiveRoute(env, db, user.id, 'municipal', payload.originMunicipalityId, payload.destinationMunicipalityId);
  }

  const id = newId();
  const now = nowMs();
  await db
    .prepare(
      `INSERT INTO courier_routes(id,user_id,origin_id,destination_id,origin_province_id,destination_province_id,
       scope,stops,frequency,days_note,service_type,vehicle_type,fee_cup,status,next_departure_at,notes,is_demo,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`
    )
    .bind(
      id, user.id,
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

  const created = (await db.prepare(`${SHARD_ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(id).first()) as unknown as RouteRow;
  const [named] = await attachRouteNames(env, [created]);
  return { route: toRouteDto(named) };
}

async function loadOwnRoute(
  env: V2Env,
  userId: string,
  routeId: string,
): Promise<{ route: RouteRow; db: D1Database; coverageType: string } | null> {
  const { db, profile } = await requireCourierShard(env, userId);
  const route = (await db.prepare(`${SHARD_ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(routeId).first()) as
    | RouteRow
    | null;
  if (!route || route.courierId !== userId) return null;
  return { route, db, coverageType: (profile.coverage_type as string) ?? 'municipal' };
}

export async function updateCourierRoute(request: Request, env: V2Env, routeId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const own = await loadOwnRoute(env, user.id, routeId);
  if (!own) throw new HttpError(404, 'Ruta no encontrada.');
  const { route, db, coverageType } = own;

  const payload = await parseRoutePayload(env, body, { partial: true, coverageType });

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
      db,
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
  apply(payload.originMunicipalityId !== undefined, 'origin_id', payload.originMunicipalityId ?? null);
  apply(payload.destinationMunicipalityId !== undefined, 'destination_id', payload.destinationMunicipalityId ?? null);
  apply(payload.originProvinceId !== undefined, 'origin_province_id', payload.originProvinceId ?? null);
  apply(payload.destinationProvinceId !== undefined, 'destination_province_id', payload.destinationProvinceId ?? null);
  apply(payload.scope !== undefined, 'scope', payload.scope);
  apply(payload.stops !== undefined, 'stops', payload.stops);
  apply(payload.frequency !== undefined, 'frequency', payload.frequency);
  apply(payload.daysNote !== undefined, 'days_note', payload.daysNote);
  apply(payload.serviceType !== undefined, 'service_type', payload.serviceType);
  apply(payload.vehicleType !== undefined, 'vehicle_type', payload.vehicleType);
  apply(payload.feeCup !== undefined, 'fee_cup', payload.feeCup ?? null);
  apply(payload.status !== undefined, 'status', payload.status);
  apply(payload.nextDepartureAt !== undefined, 'next_departure_at', payload.nextDepartureAt ?? null);
  apply(payload.notes !== undefined, 'notes', payload.notes);

  if (patch.length > 0) {
    values.push(nowMs(), route.id);
    await db.prepare(`UPDATE courier_routes SET ${patch.join(',')}, updated_at=? WHERE id=?`).bind(...values).run();
  }

  const updated = (await db.prepare(`${SHARD_ROUTE_SELECT} WHERE r.id=? LIMIT 1`).bind(route.id).first()) as unknown as RouteRow;
  const [named] = await attachRouteNames(env, [updated]);
  return { route: toRouteDto(named) };
}

export async function deleteCourierRoute(request: Request, env: V2Env, routeId: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const own = await loadOwnRoute(env, user.id, routeId);
  if (!own) throw new HttpError(404, 'Ruta no encontrada.');
  await own.db.prepare('DELETE FROM courier_routes WHERE id=?').bind(routeId).run();
  return { ok: true };
}
