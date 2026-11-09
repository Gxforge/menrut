// GET /api/routes/popular — Rutas destacadas de mensajeros públicos (sin sesión).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/lib/auth-server'
import { toRouteDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const routes = await db.route.findMany({
      where: {
        status: { in: ['active', 'scheduled'] },
        courier: { isPublic: true, user: { status: 'active' } },
      },
      include: {
        originMunicipality: true,
        destinationMunicipality: true,
        originProvince: true,
        destinationProvince: true,
        courier: { include: { user: true } },
      },
      orderBy: [{ courier: { ratingAvg: 'desc' } }, { createdAt: 'desc' }],
      take: 8,
    })

    const couriers: Record<string, string> = {}
    for (const r of routes) {
      if (!(r.courierId in couriers)) couriers[r.courierId] = r.courier.user.fullName
    }

    return NextResponse.json(
      {
        routes: routes.map((r) =>
          toRouteDto(r, r.courier.user.fullName, r.courierId),
        ),
        couriers,
      },
      { headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' } },
    )
  } catch (e) {
    return apiError(e)
  }
}
