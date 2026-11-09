// GET /api/notifications — Últimas 50 notificaciones del usuario (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth } from '@/lib/auth-server'
import { toNotificationDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ notifications: notifications.map(toNotificationDto) })
  } catch (e) {
    return apiError(e)
  }
}
