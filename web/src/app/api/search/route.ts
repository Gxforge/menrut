// GET /api/search — Búsqueda de mensajeros por ruta con etiquetas explicables.
// Público: solo CourierProfile.isPublic=true con User.status='active'.
// Filtro opcional coverageType (zone|municipal|provincial). El match de ruta
// considera rutas municipales (municipios) y provinciales (provincias): una
// ruta provincial matchea si la provincia del municipio buscado coincide.
// La lógica pura de matching/filtrado vive en @/lib/search-matching.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asBool, asString, verifyRequest } from '@/lib/auth-server'
import {
  computeMatch, filterProfiles, SearchProfile, sortMatches, toSearchItem, topAlternatives,
} from '@/lib/search-matching'
import type { CourierSearchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

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
    const base = filterProfiles(profiles, {
      serviceType,
      vehicle,
      coverageType,
      minRating,
      maxFee,
      onlyVerified,
    })

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

      sortMatches(matches, sort)
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
          const alternatives = topAlternatives(candidates, base)
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
