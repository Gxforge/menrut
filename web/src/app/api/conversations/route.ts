// /api/conversations — GET bandeja · POST iniciar conversación get-or-create (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, checkRate, requireAuth } from '@/lib/auth-server'
import { toConversationDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const conversations = await db.conversation.findMany({
      where: { OR: [{ clientId: user.id }, { courierId: user.id }] },
      include: {
        client: true,
        courier: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    const unreadRows = await db.message.groupBy({
      by: ['conversationId'],
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: { OR: [{ clientId: user.id }, { courierId: user.id }] },
      },
      _count: { _all: true },
    })
    const unreadByConv = new Map(unreadRows.map((r) => [r.conversationId, r._count._all]))

    return NextResponse.json({
      conversations: conversations.map((c) =>
        toConversationDto(c, user.id, c.messages[0] ?? null, unreadByConv.get(c.id) ?? 0),
      ),
    })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    checkRate(`conv:${user.id}`, 20, 60_000)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const courierUserId = asString(body.courierUserId)?.trim() ?? ''
    if (!courierUserId) {
      return NextResponse.json({ error: 'Falta el destinatario.' }, { status: 400 })
    }
    if (courierUserId === user.id) {
      return NextResponse.json({ error: 'No puedes iniciar una conversación contigo mismo.' }, { status: 400 })
    }
    const target = await db.user.findUnique({ where: { id: courierUserId } })
    if (!target || target.status !== 'active') {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    // La conversación enlaza cliente ↔ mensajero: si el que inicia es el
    // mensajero, se intercambian los papeles.
    const isMeCourier = user.role === 'courier' && target.role !== 'courier'
    const clientId = isMeCourier ? target.id : user.id
    const courierId = isMeCourier ? user.id : target.id

    const existing = await db.conversation.findUnique({
      where: { clientId_courierId: { clientId, courierId } },
      include: { client: true, courier: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (existing) {
      return NextResponse.json({
        conversation: toConversationDto(existing, user.id, existing.messages[0] ?? null, 0),
      })
    }

    const created = await db.conversation.create({
      data: { clientId, courierId },
      include: { client: true, courier: true, messages: true },
    })
    const otherId = target.id
    await db.notification.create({
      data: {
        userId: otherId,
        category: 'mensaje',
        title: 'Nueva conversación',
        body: `${user.fullName} quiere coordinar contigo por MENRUT.`,
      },
    })
    return NextResponse.json({
      conversation: toConversationDto(created, user.id, null, 0),
    })
  } catch (e) {
    return apiError(e)
  }
}
