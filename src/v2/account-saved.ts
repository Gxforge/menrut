// MENRUT v2 — Favoritos y rutas guardadas del cliente (datos globales en CORE,
// por identidad global; el mensajero se referencia por su user_id).
import { asBool, asString, HttpError, newId, nowMs, type V2Env } from './core';
import { requireAuth } from './identity';

// ─── /favorites (cliente → mensajero, identidad global) ─────────────────────
export async function listFavorites(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare(
      `SELECT d.*, p.avatar_path AS avatarUrl FROM favorites f
       JOIN public_courier_directory d ON d.user_id = f.courier_id
       LEFT JOIN account_profiles p ON p.user_id = f.courier_id
       WHERE f.user_id=? ORDER BY f.created_at DESC`
    )
    .bind(user.id)
    .all();
  const now = nowMs();
  const couriers = ((rows.results ?? []) as Array<Record<string, unknown>>).map((d) => {
    let nextDeparture: number | null = null;
    try {
      for (const r of JSON.parse((d.routes_json as string) || '[]') as Array<{ nextDepartureAt: number | null }>) {
        if (r.nextDepartureAt && r.nextDepartureAt > now && (!nextDeparture || r.nextDepartureAt < nextDeparture)) {
          nextDeparture = r.nextDepartureAt;
        }
      }
    } catch {
      /* proyección sin rutas */
    }
    return {
      courierId: d.user_id,
      userId: d.user_id,
      fullName: d.name,
      avatarUrl: d.avatarUrl,
      isVerified: d.is_verified === 1,
      isFavorite: true,
      ratingAvg: (d.review_count as number) > 0 ? (d.rating_sum as number) / (d.review_count as number) : 0,
      ratingCount: d.review_count,
      verifiedDeliveries: d.verified_deliveries,
      vehicleSummary: d.vehicle_summary,
      availabilityNote: d.availability_note,
      feeCup: d.base_fee_cup,
      isDemo: d.is_demo === 1,
      coverageType: d.coverage_type,
      matchReasons: ['Guardado por ti'],
      coverage: (d.coverage_csv as string) ? (d.coverage_csv as string).split(',').filter(Boolean) : [],
      nextDepartureAt: nextDeparture ? new Date(nextDeparture).toISOString() : null,
    };
  });
  return { couriers };
}

export async function toggleFavorite(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const courierId = asString(body.courierId)?.trim() ?? '';
  if (!courierId) throw new HttpError(400, 'Falta el mensajero.');
  const exists = await env.D1_CORE
    .prepare('SELECT 1 AS ok FROM public_courier_directory WHERE user_id=? LIMIT 1')
    .bind(courierId)
    .first();
  if (!exists) throw new HttpError(404, 'Mensajero no encontrado.');

  const existing = await env.D1_CORE
    .prepare('SELECT 1 AS ok FROM favorites WHERE user_id=? AND courier_id=? LIMIT 1')
    .bind(user.id, courierId)
    .first();
  if (existing) {
    await env.D1_CORE.prepare('DELETE FROM favorites WHERE user_id=? AND courier_id=?').bind(user.id, courierId).run();
    return { favorite: false };
  }
  await env.D1_CORE
    .prepare('INSERT OR IGNORE INTO favorites(user_id,courier_id) VALUES(?,?)')
    .bind(user.id, courierId)
    .run();
  return { favorite: true };
}

// ─── /saved-routes (datos del cliente, globales en CORE) ────────────────────
export async function listSavedRoutes(request: Request, env: V2Env): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const rows = await env.D1_CORE
    .prepare('SELECT * FROM saved_routes WHERE user_id=? ORDER BY created_at DESC')
    .bind(user.id)
    .all();
  const routes = [];
  for (const r of (rows.results ?? []) as Array<Record<string, unknown>>) {
    routes.push(await savedRouteDto(env, r));
  }
  return { routes };
}

async function savedRouteDto(env: V2Env, r: Record<string, unknown>): Promise<Record<string, unknown>> {
  const muns = await env.D1_CORE
    .prepare('SELECT id, name FROM Municipality WHERE id IN (?,?)')
    .bind(r.origin_municipality_id, r.destination_municipality_id)
    .all();
  const byId = new Map(((muns.results ?? []) as Array<{ id: string; name: string }>).map((m) => [m.id, m.name]));
  return {
    id: r.id,
    originId: r.origin_municipality_id,
    destinationId: r.destination_municipality_id,
    origin: byId.get(r.origin_municipality_id as string) ?? '',
    destination: byId.get(r.destination_municipality_id as string) ?? '',
    label: r.label,
    alertsEnabled: !!r.alerts_enabled,
    createdAt: new Date((r.created_at as number) * 1000).toISOString(),
  };
}

export async function createSavedRoute(request: Request, env: V2Env, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const originId = asString(body.originId)?.trim() ?? '';
  const destinationId = asString(body.destinationId)?.trim() ?? '';
  const label = (asString(body.label) ?? '').trim().slice(0, 60);
  const alertsEnabled = asBool(body.alertsEnabled) ?? true;

  if (!originId || !destinationId) throw new HttpError(400, 'Selecciona origen y destino.');
  if (originId === destinationId) throw new HttpError(400, 'El origen y el destino deben ser municipios distintos.');
  const muns = await env.D1_CORE.prepare('SELECT id FROM Municipality WHERE id IN (?,?)').bind(originId, destinationId).all();
  if ((muns.results ?? []).length !== 2) throw new HttpError(400, 'Municipio no válido.');

  const id = newId();
  await env.D1_CORE
    .prepare(
      'INSERT INTO saved_routes(id,user_id,origin_municipality_id,destination_municipality_id,label,alerts_enabled) VALUES(?,?,?,?,?,?)'
    )
    .bind(id, user.id, originId, destinationId, label, alertsEnabled ? 1 : 0)
    .run();
  const created = await env.D1_CORE.prepare('SELECT * FROM saved_routes WHERE id=?').bind(id).first() as unknown as Record<string, unknown>;
  return { route: await savedRouteDto(env, created) };
}

export async function deleteSavedRoute(request: Request, env: V2Env, id: string): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  const res = await env.D1_CORE
    .prepare('DELETE FROM saved_routes WHERE id=? AND user_id=?')
    .bind(id, user.id)
    .run();
  if (!res.meta.changes) throw new HttpError(404, 'Ruta guardada no encontrada.');
  return { ok: true };
}
