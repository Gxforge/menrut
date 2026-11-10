// POST /api/couriers/[id]/reviews — Valorar y comentar a un mensajero (auth).
// Reglas: requiere sesión (cualquier rol salvo el propio mensajero), una sola
// reseña por autor y mensajero (se actualiza si ya existía), rating 1-5 y
// comentario opcional (≤ 600 caracteres). Recalcula ratingAvg/ratingCount.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asInt, asString, checkRate, HttpError, requireAuth } from '@/lib/auth-server'
import { toReviewDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

const MAX_COMMENT = 600

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    checkRate(`review:${user.id}`, 10, 60_000)
    const { id } = await ctx.params

    const profile = await db.courierProfile.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!profile) {
      throw new HttpError(404, 'Mensajero no encontrado.')
    }
    if (profile.userId === user.id) {
      throw new HttpError(409, 'No puedes valorarte a ti mismo.')
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const rating = asInt(body.rating)
    const comment = (asString(body.comment) ?? '').trim()

    if (rating === null || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'La puntuación debe estar entre 1 y 5 estrellas.' }, { status: 400 })
    }
    if (comment.length > MAX_COMMENT) {
      return NextResponse.json(
        { error: `El comentario no puede pasar de ${MAX_COMMENT} caracteres.` },
        { status: 400 },
      )
    }

    // Una reseña por autor y mensajero: si ya existe, se actualiza (upsert).
    const review = await db.review.upsert({
      where: { courierId_authorId: { courierId: profile.id, authorId: user.id } },
      create: { courierId: profile.id, authorId: user.id, rating, comment },
      update: { rating, comment, createdAt: new Date() },
      include: { author: true },
    })

    // Recalcular agregados del mensajero (solo reseñas visibles).
    const agg = await db.review.aggregate({
      where: { courierId: profile.id, status: 'visible' },
      _avg: { rating: true },
      _count: { rating: true },
    })
    const updated = await db.courierProfile.update({
      where: { id: profile.id },
      data: {
        ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
        ratingCount: agg._count.rating,
      },
    })

    return NextResponse.json({
      review: toReviewDto(review),
      ratingAvg: updated.ratingAvg,
      ratingCount: updated.ratingCount,
    })
  } catch (e) {
    return apiError(e)
  }
}
