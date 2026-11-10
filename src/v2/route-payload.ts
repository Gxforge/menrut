// MENRUT v2 — Validación de payloads de rutas de mensajero (server-side).
// El formato depende del tipo de mensajero (corrección del propietario):
//   zone        → no define rutas (trabaja dentro de su municipio base)
//   municipal   → origen/destino por municipio (originId/destinationId)
//   provincial  → origen/destino por provincia (originProvinceId/destinationProvinceId)
import {
  asInt,
  asString,
  FREQUENCIES,
  HttpError,
  ROUTE_STATUSES,
  SERVICE_TYPES,
  VEHICLE_TYPES,
  type V2Env,
} from './core';

export const ZONE_NO_ROUTES_MESSAGE =
  'Los mensajeros de zona trabajan dentro de su municipio base y no publican rutas interterritoriales.';

export interface RoutePayload {
  originMunicipalityId?: string;
  destinationMunicipalityId?: string;
  originProvinceId?: string;
  destinationProvinceId?: string;
  scope?: 'municipal' | 'provincial';
  stops?: string;
  frequency?: string;
  daysNote?: string;
  serviceType?: string;
  vehicleType?: string;
  feeCup?: number | null;
  status?: string;
  nextDepartureAt?: number | null;
  notes?: string;
}

function text(v: unknown, max: number, label: string): string {
  const s = asString(v) ?? '';
  if (s.length > max) throw new HttpError(400, `${label} es demasiado largo (máx. ${max}).`);
  return s.trim();
}

function parseDeparture(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (typeof v !== 'string') throw new HttpError(400, 'La próxima salida debe ser una fecha ISO.');
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'La fecha de próxima salida no es válida.');
  return d.getTime();
}

export async function parseRoutePayload(
  env: V2Env,
  body: Record<string, unknown>,
  opts: { partial: boolean; coverageType: string },
): Promise<RoutePayload> {
  const payload: RoutePayload = {};

  const hasOrigin = 'originId' in body;
  const hasDestination = 'destinationId' in body;
  const hasOriginProvince = 'originProvinceId' in body;
  const hasDestinationProvince = 'destinationProvinceId' in body;
  const hasTerritoryKeys = hasOrigin || hasDestination || hasOriginProvince || hasDestinationProvince;

  // Mensajero de zona: no crea rutas ni puede redefinir origen/destino.
  if (opts.coverageType === 'zone' && (hasTerritoryKeys || !opts.partial)) {
    throw new HttpError(400, ZONE_NO_ROUTES_MESSAGE);
  }

  const originId = asString(body.originId)?.trim() ?? '';
  const destinationId = asString(body.destinationId)?.trim() ?? '';
  const originProvinceId = asString(body.originProvinceId)?.trim() ?? '';
  const destinationProvinceId = asString(body.destinationProvinceId)?.trim() ?? '';

  if (opts.coverageType === 'provincial') {
    // Provincial: origen/destino por provincia; municipios prohibidos.
    if (originId || destinationId) {
      throw new HttpError(400, 'Las rutas provinciales se definen por provincias, no por municipios.');
    }
    if (!opts.partial || hasOriginProvince) {
      if (!originProvinceId) throw new HttpError(400, 'Selecciona la provincia de origen.');
      payload.originProvinceId = originProvinceId;
    }
    if (!opts.partial || hasDestinationProvince) {
      if (!destinationProvinceId) throw new HttpError(400, 'Selecciona la provincia de destino.');
      payload.destinationProvinceId = destinationProvinceId;
    }
    if (payload.originProvinceId && payload.destinationProvinceId) {
      if (payload.originProvinceId === payload.destinationProvinceId) {
        throw new HttpError(400, 'El origen y el destino deben ser provincias distintas.');
      }
      const provs = await env.D1_CORE.prepare(
        'SELECT id FROM Province WHERE id IN (?,?)'
      )
        .bind(payload.originProvinceId, payload.destinationProvinceId)
        .all();
      if ((provs.results?.length ?? 0) !== 2) {
        throw new HttpError(400, 'Origen o destino no corresponden a una provincia válida.');
      }
    }
    payload.scope = 'provincial';
  } else {
    // Municipal: origen/destino por municipio; provincias prohibidas.
    if (originProvinceId || destinationProvinceId) {
      throw new HttpError(400, 'Las rutas municipales se definen por municipios, no por provincias.');
    }
    if (!opts.partial || hasOrigin) {
      if (!originId) throw new HttpError(400, 'Selecciona el municipio de origen.');
      payload.originMunicipalityId = originId;
    }
    if (!opts.partial || hasDestination) {
      if (!destinationId) throw new HttpError(400, 'Selecciona el municipio de destino.');
      payload.destinationMunicipalityId = destinationId;
    }
    if (payload.originMunicipalityId && payload.destinationMunicipalityId) {
      if (payload.originMunicipalityId === payload.destinationMunicipalityId) {
        throw new HttpError(400, 'El origen y el destino deben ser municipios distintos.');
      }
      const muns = await env.D1_CORE.prepare(
        'SELECT id FROM Municipality WHERE id IN (?,?)'
      )
        .bind(payload.originMunicipalityId, payload.destinationMunicipalityId)
        .all();
      if ((muns.results?.length ?? 0) !== 2) {
        throw new HttpError(400, 'Origen o destino no corresponden a un municipio válido.');
      }
    }
    payload.scope = 'municipal';
  }

  if ('stops' in body) payload.stops = text(body.stops, 300, 'Las paradas');
  if ('daysNote' in body) payload.daysNote = text(body.daysNote, 120, 'La nota de días');
  if ('notes' in body) payload.notes = text(body.notes, 500, 'Las notas');

  if ('frequency' in body) {
    const f = asString(body.frequency) ?? '';
    if (!(FREQUENCIES as readonly string[]).includes(f)) {
      throw new HttpError(400, 'Frecuencia no válida.');
    }
    payload.frequency = f;
  }
  if ('serviceType' in body) {
    const s = asString(body.serviceType) ?? '';
    if (!(SERVICE_TYPES as readonly string[]).includes(s)) {
      throw new HttpError(400, 'Tipo de servicio no válido.');
    }
    payload.serviceType = s;
  }
  if ('vehicleType' in body) {
    const v = asString(body.vehicleType) ?? '';
    if (!(VEHICLE_TYPES as readonly string[]).includes(v)) {
      throw new HttpError(400, 'Tipo de vehículo no válido.');
    }
    payload.vehicleType = v;
  }
  if ('status' in body) {
    const st = asString(body.status) ?? '';
    if (!(ROUTE_STATUSES as readonly string[]).includes(st)) {
      throw new HttpError(400, 'Estado de ruta no válido.');
    }
    payload.status = st;
  }
  if ('feeCup' in body) {
    if (body.feeCup === null || body.feeCup === '') {
      payload.feeCup = null;
    } else {
      const fee = asInt(body.feeCup);
      if (fee === null || fee < 0) throw new HttpError(400, 'La tarifa debe ser un número entero positivo.');
      payload.feeCup = fee;
    }
  }
  if ('nextDepartureAt' in body) {
    payload.nextDepartureAt = parseDeparture(body.nextDepartureAt);
  }

  return payload;
}

// Duplicado: el mensajero ya tiene una ruta activa igual publicada (shard).
export async function assertNoDuplicateActiveRoute(
  env: V2Env,
  db: D1Database,
  courierId: string,
  scope: 'municipal' | 'provincial',
  originId: string | null | undefined,
  destinationId: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  if (!originId || !destinationId) return;
  const dup = await db
    .prepare(
      `SELECT id FROM courier_routes WHERE user_id=? AND status='active' AND id<>?
       AND ${
         scope === 'provincial'
           ? 'origin_province_id=? AND destination_province_id=?'
           : 'origin_id=? AND destination_id=?'
       } LIMIT 1`
    )
    .bind(courierId, excludeId ?? '', originId, destinationId)
    .first();
  if (dup) throw new HttpError(409, 'Ya tienes una ruta igual publicada.');
}
