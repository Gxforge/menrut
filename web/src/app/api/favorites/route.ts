// /api/favorites — GET lista de favoritos · POST toggle (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, requireAuth } from '@/lib/auth-server'
import type { CourierProfile, CourierService, Municipality, Route, User } from '@prisma/client'
import type { CourierSearchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

type FavProfile = CourierProfile & {
  user: User
  services: CourierService[]
  coverage: { municipality: Municipality }[]
  routes: Route[]
}

function toSearchItem(p: FavProfile): CourierSearchItem {
  let nextDeparture: Date | null = null
  for (const r of p.routes) {
    if (
      (r.status === 'active' || r.status === 'scheduled') &&
      r.nextDepartureAt &&
      r.nextDepartureAt.getTime() > Date.now() &&
      (!nextDeparture || r.nextDepartureAt.getTime() < nextDeparture.getTime())
    ) {
      nextDeparture = r.nextDepartureAt
    }
  }
  return {
    courierId: p.id,
    userId: p.user.id,
    fullName: p.user.fullName,
    avatarUrl: p.user.avatarUrl,
    isVerified: p.verificationStatus === 'verified',
    isFavorite: true,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    verifiedDeliveries: p.verifiedDeliveries,
    vehicleSummary: p.vehicleSummary,
    availabilityNote: p.availabilityNote,
    feeCup: p.baseFeeCup,
    isDemo: p.isDemo,
    coverageType: p.coverageType as CourierSearchItem['coverageType'],
    matchReasons: ['Guardado por ti'],
    coverage: p.coverage.map((c) => c.municipality.name),
    nextDepartureAt: nextDeparture ? nextDeparture.toISOString() : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const favorites = await db.favorite.findMany({
      where: { userId: user.id },
      include: {
        courier: {
          include: {
            user: true,
            services: true,
            coverage: { include: { municipality: true } },
            routes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ couriers: favorites.map((f) => toSearchItem(f.courier as FavProfile)) })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const courierId = asString(body.courierId)?.trim() ?? ''
    if (!courierId) {
      return NextResponse.json({ error: 'Falta el mensajero.' }, { status: 400 })
    }
    const profile = await db.courierProfile.findUnique({ where: { id: courierId } })
    if (!profile) {
      return NextResponse.json({ error: 'Mensajero no encontrado.' }, { status: 404 })
    }
    const existing = await db.favorite.findUnique({
      where: { userId_courierId: { userId: user.id, courierId } },
    })
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorite: false })
    }
    await db.favorite.create({ data: { userId: user.id, courierId } })
    return NextResponse.json({ favorite: true })
  } catch (e) {
    return apiError(e)
  }
}
