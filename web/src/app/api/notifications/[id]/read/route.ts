// POST /api/notifications/[id]/read — Marca como leída una notificación propia (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    const { id } = await ctx.params
    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: 'Notificación no encontrada.' }, { status: 404 })
    }
    if (!notification.readAt) {
      await db.notification.update({ where: { id }, data: { readAt: new Date() } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
