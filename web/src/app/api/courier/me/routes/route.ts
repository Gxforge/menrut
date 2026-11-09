// /api/courier/me/routes — GET mis rutas · POST crear ruta (auth + courier).
// El formato del origen/destino depende del tipo de mensajero:
// zone (no publica rutas) · municipal (municipios) · provincial (provincias).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, HttpError, requireAuth, requireExactRole } from '@/lib/auth-server'
import { toRouteDto } from '@/lib/dto'
import { assertNoDuplicateActiveRoute, parseRoutePayload, ZONE_NO_ROUTES_MESSAGE } from '@/lib/route-payload'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  originMunicipality: true,
  destinationMunicipality: true,
  originProvince: true,
  destinationProvince: true,
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }
    const routes = await db.route.findMany({
      where: { courierId: profile.id },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ routes: routes.map((r) => toRouteDto(r)) })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }
    if (profile.coverageType === 'zone') {
      throw new HttpError(400, ZONE_NO_ROUTES_MESSAGE)
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const payload = await parseRoutePayload(body, {
      partial: false,
      coverageType: profile.coverageType,
    })

    const isProvincial = payload.scope === 'provincial'
    if (isProvincial) {
      if (!payload.originProvinceId || !payload.destinationProvinceId) {
        throw new HttpError(400, 'Selecciona las provincias de origen y destino.')
      }
      await assertNoDuplicateActiveRoute(
        profile.id,
        'provincial',
        payload.originProvinceId,
        payload.destinationProvinceId,
      )
    } else {
      if (!payload.originMunicipalityId || !payload.destinationMunicipalityId) {
        throw new HttpError(400, 'Selecciona origen y destino.')
      }
      await assertNoDuplicateActiveRoute(
        profile.id,
        'municipal',
        payload.originMunicipalityId,
        payload.destinationMunicipalityId,
      )
    }

    const created = await db.route.create({
      data: {
        courierId: profile.id,
        originMunicipalityId: isProvincial ? null : payload.originMunicipalityId,
        destinationMunicipalityId: isProvincial ? null : payload.destinationMunicipalityId,
        originProvinceId: isProvincial ? payload.originProvinceId : null,
        destinationProvinceId: isProvincial ? payload.destinationProvinceId : null,
        scope: payload.scope ?? 'municipal',
        stops: payload.stops ?? '',
        frequency: payload.frequency ?? 'personalizada',
        daysNote: payload.daysNote ?? '',
        serviceType: payload.serviceType ?? 'paquetes',
        vehicleType: payload.vehicleType ?? 'motor',
        feeCup: payload.feeCup ?? null,
        status: payload.status ?? 'active',
        nextDepartureAt: payload.nextDepartureAt ?? null,
        notes: payload.notes ?? '',
      },
      include: INCLUDE,
    })
    return NextResponse.json({ route: toRouteDto(created) })
  } catch (e) {
    return apiError(e)
  }
}
