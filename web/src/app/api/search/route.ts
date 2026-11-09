// GET /api/search — Búsqueda de mensajeros por ruta con etiquetas explicables.
// Público: solo CourierProfile.isPublic=true con User.status='active'.
// Filtro opcional coverageType (zone|municipal|provincial). El match de ruta
// considera rutas municipales (municipios) y provinciales (provincias): una
// ruta provincial matchea si la provincia del municipio buscado coincide.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asBool, asString, COVERAGE_TYPES, verifyRequest } from '@/lib/auth-server'
import type {
  CourierProfile,
  CourierService,
  Municipality,
  Province,
  Route,
  User,
} from '@prisma/client'
import type { CourierSearchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

type CoverageWithMun = { municipalityId: string; municipality: Municipality }
type RouteWithTerrs = Route & {
  originMunicipality: Municipality | null
  destinationMunicipality: Municipality | null
  originProvince: Province | null
  destinationProvince: Province | null
}
type SearchProfile = CourierProfile & {
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

const VISIBLE_ROUTE_STATUSES = ['active', 'scheduled']

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

interface MatchResult {
  reasons: string[]
  tier: 0 | 1 | 2 | 3 // 0 exacta · 1 parcial · 2 cobertura · 3 sin match
  nextDepartureAt: string | null
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

function toSearchItem(
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

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const originId = asString(sp.get('origin')) || null
    const destinationId = asString(sp.get('destination')) || null
    const routeMode = asString(sp.get('routeMode')) ?? 'any' // any | full | partial
    const serviceType = asString(sp.get('serviceType')) ?? 'any'
    const vehicle = asString(sp.get('vehicle')) ?? 'any'
    const coverageType = asString(sp.get('coverageType')) ?? 'any'
    const minRatingRaw = asString(sp.get('minRating'))
    const minRating =
      minRatingRaw !== null && minRatingRaw !== '' && Number.isFinite(Number(minRatingRaw))
        ? Number(minRatingRaw)
        : null
    const maxFeeRaw = asString(sp.get('maxFee'))
    const maxFee =
      maxFeeRaw !== null && maxFeeRaw !== '' && Number.isFinite(Number(maxFeeRaw))
        ? Number(maxFeeRaw)
        : null
    const onlyVerified = asBool(sp.get('onlyVerified')) ?? false
    const sort = asString(sp.get('sort')) ?? 'relevance'

    // Favoritos reales si llega un token válido (opcional en búsqueda).
    const auth = await verifyRequest(req)
    let favoriteIds = new Set<string>()
    if (auth) {
      const favs = await db.favorite.findMany({
        where: { userId: auth.user.id },
        select: { courierId: true },
      })
      favoriteIds = new Set(favs.map((f) => f.courierId))
    }

    const profiles = (await db.courierProfile.findMany({
      where: { isPublic: true, user: { status: 'active' } },
      include: {
        user: true,
        services: true,
        coverage: { include: { municipality: true } },
        routes: {
          include: {
            originMunicipality: true,
            destinationMunicipality: true,
            originProvince: true,
            destinationProvince: true,
          },
        },
      },
    })) as SearchProfile[]

    // Filtros por atributos del mensajero (independientes de la ruta).
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

    const results: CourierSearchItem[] = []

    if (originId || destinationId) {
      // Validar municipios buscados
      const wantedIds = [originId, destinationId].filter((v): v is string => !!v)
      const muns = await db.municipality.findMany({ where: { id: { in: wantedIds } } })
      const munById = new Map(muns.map((m) => [m.id, m]))
      if (wantedIds.some((id) => !munById.has(id))) {
        return NextResponse.json({ results: [], alternatives: [] })
      }
      const originName = originId ? munById.get(originId)?.name ?? null : null
      const destinationName = destinationId ? munById.get(destinationId)?.name ?? null : null
      const originProvinceId = originId ? munById.get(originId)?.provinceId ?? null : null
      const destinationProvinceId = destinationId ? munById.get(destinationId)?.provinceId ?? null : null

      const matches: { item: CourierSearchItem; tier: number; verifiedRank: number }[] = []
      for (const p of base) {
        const match = computeMatch(
          p,
          originId,
          destinationId,
          originName,
          destinationName,
          originProvinceId,
          destinationProvinceId,
        )
        if (match.tier === 3) continue // sin ninguna razón de match
        if (routeMode === 'full' && match.tier !== 0) continue // solo rutas completas
        if (routeMode === 'partial' && match.tier > 1) continue // exactas + parciales
        matches.push({
          item: toSearchItem(p, match.reasons, match.nextDepartureAt, favoriteIds.has(p.id)),
          tier: match.tier,
          verifiedRank: p.verificationStatus === 'verified' ? 0 : 1,
        })
      }

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
      results.push(...matches.map((m) => m.item))

      // Alternativas: municipios cercanos (misma provincia) con mensajeros reales.
      if (results.length === 0 && originId && destinationId) {
        const originMun = munById.get(originId)
        const destMun = munById.get(destinationId)
        const provinceIds = [
          ...new Set([originMun?.provinceId, destMun?.provinceId].filter((v): v is string => !!v)),
        ]
        if (provinceIds.length > 0) {
          const candidates = await db.municipality.findMany({
            where: { provinceId: { in: provinceIds }, id: { notIn: wantedIds } },
            include: { province: true },
          })
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
          const alternatives = scored.slice(0, 3).map((s) => s.name)
          return NextResponse.json({ results, alternatives })
        }
      }
      return NextResponse.json({ results, alternatives: [] })
    }

    // Modo directorio (sin origen/destino): top por valoración, máx 10.
    const directory = [...base]
      .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
      .slice(0, 10)
      .map((p) => toSearchItem(p, [], null, favoriteIds.has(p.id)))
    results.push(...directory)
    return NextResponse.json({ results, alternatives: [] })
  } catch (e) {
    return apiError(e)
  }
}
