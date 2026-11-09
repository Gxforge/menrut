// /api/courier/me/routes/[id] — PATCH/PUT editar · DELETE eliminar (solo rutas propias).
// PUT es alias de PATCH (mismo contrato). El origen/destino se valida según el
// tipo de mensajero: municipal (municipios) · provincial (provincias) · zone (bloqueado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, HttpError, requireAuth, requireExactRole } from '@/lib/auth-server'
import { toRouteDto } from '@/lib/dto'
import { assertNoDuplicateActiveRoute, parseRoutePayload } from '@/lib/route-payload'

export const dynamic = 'force-dynamic'

const INCLUDE = {
  originMunicipality: true,
  destinationMunicipality: true,
  originProvince: true,
  destinationProvince: true,
}

async function loadOwnRoute(userId: string, routeId: string) {
  const profile = await db.courierProfile.findUnique({ where: { userId } })
  if (!profile) {
    throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
  }
  const route = await db.route.findUnique({ where: { id: routeId } })
  if (!route || route.courierId !== profile.id) return null
  return { route, profile }
}

async function handlePatch(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const { id } = await ctx.params
    const own = await loadOwnRoute(user.id, id)
    if (!own) {
      return NextResponse.json({ error: 'Ruta no encontrada.' }, { status: 404 })
    }
    const { route, profile } = own

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const payload = await parseRoutePayload(body, {
      partial: true,
      coverageType: profile.coverageType,
    })

    // Origen/destino efectivos tras el parche (según el scope resultante).
    const scope = payload.scope ?? (route.scope as 'municipal' | 'provincial')
    const originMunicipalityId = payload.originMunicipalityId ?? route.originMunicipalityId
    const destinationMunicipalityId = payload.destinationMunicipalityId ?? route.destinationMunicipalityId
    const originProvinceId = payload.originProvinceId ?? route.originProvinceId
    const destinationProvinceId = payload.destinationProvinceId ?? route.destinationProvinceId
    const territoryChanged =
      (payload.originMunicipalityId !== undefined && payload.originMunicipalityId !== route.originMunicipalityId) ||
      (payload.destinationMunicipalityId !== undefined &&
        payload.destinationMunicipalityId !== route.destinationMunicipalityId) ||
      (payload.originProvinceId !== undefined && payload.originProvinceId !== route.originProvinceId) ||
      (payload.destinationProvinceId !== undefined &&
        payload.destinationProvinceId !== route.destinationProvinceId)
    if (territoryChanged) {
      await assertNoDuplicateActiveRoute(
        route.courierId,
        scope,
        scope === 'provincial' ? originProvinceId : originMunicipalityId,
        scope === 'provincial' ? destinationProvinceId : destinationMunicipalityId,
        route.id,
      )
    }

    const updated = await db.route.update({
      where: { id: route.id },
      data: {
        ...(payload.originMunicipalityId !== undefined ? { originMunicipalityId: payload.originMunicipalityId } : {}),
        ...(payload.destinationMunicipalityId !== undefined
          ? { destinationMunicipalityId: payload.destinationMunicipalityId }
          : {}),
        ...(payload.originProvinceId !== undefined ? { originProvinceId: payload.originProvinceId } : {}),
        ...(payload.destinationProvinceId !== undefined
          ? { destinationProvinceId: payload.destinationProvinceId }
          : {}),
        ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
        ...(payload.stops !== undefined ? { stops: payload.stops } : {}),
        ...(payload.frequency !== undefined ? { frequency: payload.frequency } : {}),
        ...(payload.daysNote !== undefined ? { daysNote: payload.daysNote } : {}),
        ...(payload.serviceType !== undefined ? { serviceType: payload.serviceType } : {}),
        ...(payload.vehicleType !== undefined ? { vehicleType: payload.vehicleType } : {}),
        ...(payload.feeCup !== undefined ? { feeCup: payload.feeCup } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.nextDepartureAt !== undefined
          ? { nextDepartureAt: payload.nextDepartureAt }
          : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      },
      include: INCLUDE,
    })
    return NextResponse.json({ route: toRouteDto(updated) })
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handlePatch(req, ctx)
}

// Alias explícito de PATCH (el contrato del cliente puede usar PUT).
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handlePatch(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const { id } = await ctx.params
    const own = await loadOwnRoute(user.id, id)
    if (!own) {
      return NextResponse.json({ error: 'Ruta no encontrada.' }, { status: 404 })
    }
    await db.route.delete({ where: { id: own.route.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
