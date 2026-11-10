// MENRUT — Lógica pura de búsqueda de mensajeros (extracción de
// src/app/api/search/route.ts): tipos del perfil consultado, filtros por
// atributos, match de ruta con etiquetas explicables, orden y alternativas.
// Sin acceso a base de datos: el route handler pasa los datos ya consultados.
import { COVERAGE_TYPES } from '@/lib/auth-server'
import type {
  CourierProfile,
  CourierService,
  Municipality,
  Province,
  Route,
  User,
} from '@prisma/client'
import type { CourierSearchItem } from '@/lib/types'

export type CoverageWithMun = { municipalityId: string; municipality: Municipality }
export type RouteWithTerrs = Route & {
  originMunicipality: Municipality | null
  destinationMunicipality: Municipality | null
  originProvince: Province | null
  destinationProvince: Province | null
}
export type SearchProfile = CourierProfile & {
  user: User
  services: CourierService[]
  coverage: CoverageWithMun[]
  routes: RouteWithTerrs[]
}

// Etiquetas de texto libre que sugieren cada tipo de vehículo en vehicleSummary.
const VEHICLE_HINTS: Record<string, string[]> = {
  motor: ['motor', 'moto'],
  auto: ['auto', 'carro'],
  panel: ['panel'],
  camion: ['camión', 'camion'],
  bicielectrica: ['bici'],
}

export const VISIBLE_ROUTE_STATUSES = ['active', 'scheduled']

function vehicleMatches(p: SearchProfile, vehicle: string): boolean {
  if (p.routes.some((r) => r.vehicleType === vehicle)) return true
  const hints = VEHICLE_HINTS[vehicle] ?? []
  const summary = p.vehicleSummary.toLowerCase()
  return hints.some((h) => summary.includes(h))
}

function parseStops(stops: string): string[] {
  return stops
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export interface MatchResult {
  reasons: string[]
  tier: 0 | 1 | 2 | 3 // 0 exacta · 1 parcial · 2 cobertura · 3 sin match
  nextDepartureAt: string | null
}

export function computeMatch(
  p: SearchProfile,
  originId: string | null,
  destinationId: string | null,
  originName: string | null,
  destinationName: string | null,
  originProvinceId: string | null,
  destinationProvinceId: string | null,
): MatchResult {
  const reasons: string[] = []
  let exact = false
  let partial = false
  let covered = false
  let nextDeparture: Date | null = null

  const visibleRoutes = p.routes.filter((r) => VISIBLE_ROUTE_STATUSES.includes(r.status))

  for (const r of visibleRoutes) {
    // Ruta municipal: coincidencia exacta de municipios (ida o vuelta).
    // Ruta provincial: coincidencia de las provincias de los municipios buscados.
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
    )
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
    )
    if (fwd || bwd) {
      exact = true
      if (!reasons.includes('Cubre tu ruta')) reasons.push('Cubre tu ruta')
      if (r.frequency === 'diaria' && !reasons.includes('Ruta frecuente')) reasons.push('Ruta frecuente')
    }
    if (r.nextDepartureAt && r.nextDepartureAt.getTime() > Date.now()) {
      if (!nextDeparture || r.nextDepartureAt.getTime() < nextDeparture.getTime()) {
        nextDeparture = r.nextDepartureAt
      }
    }
  }

  if (!exact) {
    for (const r of visibleRoutes) {
      const stops = parseStops(r.stops)
      const hasOrigin =
        !!originId &&
        (r.originMunicipalityId === originId ||
          r.destinationMunicipalityId === originId ||
          (!!r.originProvinceId && !!originProvinceId && r.originProvinceId === originProvinceId) ||
          (!!r.destinationProvinceId && !!originProvinceId && r.destinationProvinceId === originProvinceId))
      const hasDestination =
        !!destinationId &&
        (r.originMunicipalityId === destinationId ||
          r.destinationMunicipalityId === destinationId ||
          (!!r.originProvinceId && !!destinationProvinceId && r.originProvinceId === destinationProvinceId) ||
          (!!r.destinationProvinceId &&
            !!destinationProvinceId &&
            r.destinationProvinceId === destinationProvinceId))
      const originInStops = !!originName && stops.includes(originName.toLowerCase())
      const destinationInStops = !!destinationName && stops.includes(destinationName.toLowerCase())
      const touches = hasOrigin || hasDestination || originInStops || destinationInStops
      // Parcial: la ruta toca solo uno de los extremos (o como parada intermedia).
      if (touches && (!hasOrigin || !hasDestination)) {
        partial = true
        if (!reasons.includes('Ruta parcial')) reasons.push('Ruta parcial')
        break
      }
    }
  }

  if (originId || destinationId) {
    if (
      (originId && p.coverage.some((c) => c.municipalityId === originId)) ||
      (destinationId && p.coverage.some((c) => c.municipalityId === destinationId))
    ) {
      covered = true
      if (!reasons.includes('Cobertura en tu municipio')) reasons.push('Cobertura en tu municipio')
    }
    if (nextDeparture && !reasons.includes('Próximo recorrido')) reasons.push('Próximo recorrido')
  }

  const tier: MatchResult['tier'] = exact ? 0 : partial ? 1 : covered ? 2 : 3
  return { reasons, tier, nextDepartureAt: nextDeparture ? nextDeparture.toISOString() : null }
}

export function toSearchItem(
  p: SearchProfile,
  reasons: string[],
  nextDepartureAt: string | null,
  isFavorite: boolean,
): CourierSearchItem {
  return {
    courierId: p.id,
    userId: p.user.id,
    fullName: p.user.fullName,
    avatarUrl: p.user.avatarUrl,
    isVerified: p.verificationStatus === 'verified',
    isFavorite,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    verifiedDeliveries: p.verifiedDeliveries,
    vehicleSummary: p.vehicleSummary,
    availabilityNote: p.availabilityNote,
    feeCup: p.baseFeeCup,
    isDemo: p.isDemo,
    coverageType: p.coverageType as CourierSearchItem['coverageType'],
    matchReasons: reasons,
    coverage: p.coverage.map((c) => c.municipality.name),
    nextDepartureAt,
  }
}

// Filtros por atributos del mensajero (independientes de la ruta).
export function filterProfiles(
  profiles: SearchProfile[],
  opts: {
    serviceType: string
    vehicle: string
    coverageType: string
    minRating: number | null
    maxFee: number | null
    onlyVerified: boolean
  },
): SearchProfile[] {
  const { serviceType, vehicle, coverageType, minRating, maxFee, onlyVerified } = opts
  let base = profiles
  if (serviceType && serviceType !== 'any') {
    base = base.filter((p) => p.services.some((s) => s.serviceType === serviceType))
  }
  if (vehicle && vehicle !== 'any') {
    base = base.filter((p) => vehicleMatches(p, vehicle))
  }
  if ((COVERAGE_TYPES as readonly string[]).includes(coverageType)) {
    base = base.filter((p) => p.coverageType === coverageType)
  }
  if (minRating !== null) {
    base = base.filter((p) => p.ratingAvg >= minRating)
  }
  if (maxFee !== null) {
    base = base.filter((p) => p.baseFeeCup !== null && p.baseFeeCup <= maxFee)
  }
  if (onlyVerified) {
    base = base.filter((p) => p.verificationStatus === 'verified')
  }
  return base
}

export interface ScoredMatch {
  item: CourierSearchItem
  tier: number
  verifiedRank: number
}

export function sortMatches(matches: ScoredMatch[], sort: string): ScoredMatch[] {
  matches.sort((a, b) => {
    if (sort === 'rating') {
      return b.item.ratingAvg - a.item.ratingAvg || b.item.ratingCount - a.item.ratingCount
    }
    if (sort === 'availability') {
      const av = (a.item.availabilityNote ? 0 : 1) - (b.item.availabilityNote ? 0 : 1)
      if (av !== 0) return av
      return b.item.ratingAvg - a.item.ratingAvg || b.item.ratingCount - a.item.ratingCount
    }
    // relevance: exactas → parciales → cobertura; verificadas primero; rating desc
    return (
      a.tier - b.tier ||
      a.verifiedRank - b.verifiedRank ||
      b.item.ratingAvg - a.item.ratingAvg ||
      b.item.ratingCount - a.item.ratingCount
    )
  })
  return matches
}

// Alternativas: municipios cercanos (misma provincia) con mensajeros reales.
// Devuelve los nombres «Provincia · Municipio» con más presencia, máx 3.
export function topAlternatives(
  candidates: { id: string; name: string; provinceId: string; province: { name: string } }[],
  base: SearchProfile[],
): string[] {
  const scored: { name: string; count: number }[] = []
  for (const m of candidates) {
    let count = 0
    for (const p of base) {
      const touch =
        p.routes.some(
          (r) =>
            VISIBLE_ROUTE_STATUSES.includes(r.status) &&
            (r.originMunicipalityId === m.id ||
              r.destinationMunicipalityId === m.id ||
              r.originProvinceId === m.provinceId ||
              r.destinationProvinceId === m.provinceId),
        ) || p.coverage.some((c) => c.municipalityId === m.id)
      if (touch) count += 1
    }
    if (count > 0) scored.push({ name: `${m.province.name} · ${m.name}`, count })
  }
  scored.sort((a, b) => b.count - a.count)
  return scored.slice(0, 3).map((s) => s.name)
}
