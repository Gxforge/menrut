// GET /api/courier/me/reviews — Reputación propia + distribución de valoraciones.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, HttpError, requireAuth, requireExactRole } from '@/lib/auth-server'
import { toReviewDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    const reviews = await db.review.findMany({
      where: { courierId: profile.id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })

    const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    for (const r of reviews) {
      const key = String(r.rating)
      if (key in distribution) distribution[key] += 1
    }

    return NextResponse.json({
      reviews: reviews.map(toReviewDto),
      distribution,
    })
  } catch (e) {
    return apiError(e)
  }
}
