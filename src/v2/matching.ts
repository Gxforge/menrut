// MENRUT v2 — Emparejamiento de búsqueda (funciones puras, sin I/O).
// Mismas reglas que la app: ruta exacta → parcial → cobertura; orden por
// relevancia, verificación y valoración.
import type { RouteProjectionItem as RoutePayload } from './shard';

export interface SearchProfile {
  courierId: string;
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
  // Municipio base declarado (directorio). Un mensajero de zona trabaja dentro de él.
  municipalityId?: string | null;
  isDemo: number;
  highlightedUntil: number;
  services: string[];
  coverage: Array<{ municipalityId: string; name: string }>;
  routes: RoutePayload[];
}

export const VISIBLE_ROUTE_STATUSES = ['active', 'scheduled'];

const VEHICLE_HINTS: Record<string, string[]> = {
  motor: ['motor', 'moto'],
  auto: ['auto', 'carro'],
  panel: ['panel'],
  camion: ['camión', 'camion'],
  bicielectrica: ['bici'],
};

export function parseStops(stops: string): string[] {
  return stops
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function vehicleMatches(p: SearchProfile, vehicle: string): boolean {
  if (p.routes.some((r) => r.vehicleType === vehicle)) return true;
  const hints = VEHICLE_HINTS[vehicle] ?? [];
  const summary = p.vehicleSummary.toLowerCase();
  return hints.some((h) => summary.includes(h));
}

export interface MatchResult {
  reasons: string[];
  tier: 0 | 1 | 2 | 3; // 0 exacta · 1 parcial · 2 cobertura · 3 sin match
  nextDepartureAt: number | null;
}

export function computeMatch(
  p: SearchProfile,
  originId: string | null,
  destinationId: string | null,
  originName: string | null,
  destinationName: string | null,
  originProvinceId: string | null,
  destinationProvinceId: string | null,
  now: number,
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
    if (r.nextDepartureAt && r.nextDepartureAt > now) {
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
    // Zona: su municipio base cuenta como cobertura (no tiene lista de municipios).
    const baseIsZone =
      p.coverageType === 'zone' &&
      !!p.municipalityId &&
      (p.municipalityId === originId || p.municipalityId === destinationId);
    if (
      baseIsZone ||
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

export function toSearchItem(
  p: SearchProfile,
  reasons: string[],
  nextDepartureAt: number | null,
  isFavorite: boolean,
): Record<string, unknown> {
  return {
    courierId: p.courierId,
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
    isHighlighted: p.highlightedUntil > Date.now(),
    matchReasons: reasons,
    coverage: p.coverage.map((c) => c.name),
    nextDepartureAt: nextDepartureAt ? new Date(nextDepartureAt).toISOString() : null,
  };
}

export interface SortableMatch {
  item: Record<string, unknown>;
  tier: number;
  verifiedRank: number;
}

export function sortMatches(matches: SortableMatch[], sort: string): SortableMatch[] {
  return [...matches].sort((a, b) => {
    const ra = a.item.ratingAvg as number;
    const rb = b.item.ratingAvg as number;
    const ca = a.item.ratingCount as number;
    const cb = b.item.ratingCount as number;
    // Destacados (herramienta activa) encabezan su grupo de relevancia.
    const ha = a.item.isHighlighted ? 0 : 1;
    const hb = b.item.isHighlighted ? 0 : 1;
    if (sort === 'rating') return ha - hb || rb - ra || cb - ca;
    if (sort === 'availability') {
      const av = ((a.item.availabilityNote as string) ? 0 : 1) - ((b.item.availabilityNote as string) ? 0 : 1);
      if (av !== 0) return av;
      return ha - hb || rb - ra || cb - ca;
    }
    return a.tier - b.tier || ha - hb || a.verifiedRank - b.verifiedRank || rb - ra || cb - ca;
  });
}
