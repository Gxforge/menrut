// /api/saved-routes — GET rutas guardadas · POST crear (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asBool, asString, requireAuth } from '@/lib/auth-server'
import type { SavedRouteDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function toDto(
  r: { id: string; originMunicipalityId: string; destinationMunicipalityId: string; label: string; alertsEnabled: boolean; createdAt: Date },
): Promise<SavedRouteDto> {
  const muns = await db.municipality.findMany({
    where: { id: { in: [r.originMunicipalityId, r.destinationMunicipalityId] } },
  })
  const byId = new Map(muns.map((m) => [m.id, m.name]))
  return {
    id: r.id,
    originId: r.originMunicipalityId,
    destinationId: r.destinationMunicipalityId,
    origin: byId.get(r.originMunicipalityId) ?? '',
    destination: byId.get(r.destinationMunicipalityId) ?? '',
    label: r.label,
    alertsEnabled: r.alertsEnabled,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const routes = await db.savedRoute.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    const dtos = await Promise.all(routes.map(toDto))
    return NextResponse.json({ routes: dtos })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const originId = asString(body.originId)?.trim() ?? ''
    const destinationId = asString(body.destinationId)?.trim() ?? ''
    const label = (asString(body.label) ?? '').trim().slice(0, 60)
    const alertsEnabled = asBool(body.alertsEnabled) ?? true

    if (!originId || !destinationId) {
      return NextResponse.json({ error: 'Selecciona origen y destino.' }, { status: 400 })
    }
    if (originId === destinationId) {
      return NextResponse.json(
        { error: 'El origen y el destino deben ser municipios distintos.' },
        { status: 400 },
      )
    }
    const muns = await db.municipality.findMany({
      where: { id: { in: [originId, destinationId] } },
    })
    if (muns.length !== 2) {
      return NextResponse.json({ error: 'Municipio no válido.' }, { status: 400 })
    }

    const created = await db.savedRoute.create({
      data: { userId: user.id, originMunicipalityId: originId, destinationMunicipalityId: destinationId, label, alertsEnabled },
    })
    return NextResponse.json({ route: await toDto(created) })
  } catch (e) {
    return apiError(e)
  }
}
