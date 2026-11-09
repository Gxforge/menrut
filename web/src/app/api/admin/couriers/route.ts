// GET /api/admin/couriers?status= — Directorio de mensajeros para administración.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, requireAuth, requireRole } from '@/lib/auth-server'
import type { AdminCourierDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const status = asString(req.nextUrl.searchParams.get('status'))?.trim() ?? ''
    let where = {}
    if (status === 'hidden') {
      where = { isPublic: false }
    } else if (status === 'demo') {
      where = { isDemo: true }
    } else if (['verified', 'pending', 'unverified', 'rejected'].includes(status)) {
      where = { verificationStatus: status }
    }

    const profiles = await db.courierProfile.findMany({
      where,
      include: {
        user: true,
        wallet: true,
        memberships: {
          where: { status: 'active' },
          orderBy: { expiresAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const routeCounts = await db.route.groupBy({
      by: ['courierId'],
      _count: { _all: true },
    })
    const routesByCourier = new Map(routeCounts.map((r) => [r.courierId, r._count._all]))

    const couriers: AdminCourierDto[] = profiles.map((p) => {
      const membership = p.memberships[0]
      return {
        courierId: p.id,
        userId: p.user.id,
        fullName: p.user.fullName,
        email: p.user.email,
        avatarUrl: p.user.avatarUrl,
        verificationStatus: p.verificationStatus,
        isPublic: p.isPublic,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        routesCount: routesByCourier.get(p.id) ?? 0,
        planName: membership?.plan.name ?? null,
        planExpiresAt: membership?.expiresAt.toISOString() ?? null,
        permanenceCredits: p.wallet?.permanenceCredits ?? 0,
        createdAt: p.createdAt.toISOString(),
        isDemo: p.isDemo,
      }
    })
    return NextResponse.json({ couriers })
  } catch (e) {
    return apiError(e)
  }
}
