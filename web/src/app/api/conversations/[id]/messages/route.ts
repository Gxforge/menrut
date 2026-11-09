// /api/conversations/[id]/messages — GET historial (marca leídos) · POST enviar (auth).
// Solo participantes. La persistencia pasa SIEMPRE por aquí (fuente única de
// verdad): el mini-service de chat también envía vía este endpoint.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, checkRate, requireAuth } from '@/lib/auth-server'
import { toMessageDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

async function loadConversationFor(id: string, userId: string) {
  const conv = await db.conversation.findUnique({ where: { id } })
  if (!conv) return null
  if (conv.clientId !== userId && conv.courierId !== userId) return null
  return conv
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    const { id } = await ctx.params
    const conv = await loadConversationFor(id, user.id)
    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 })
    }

    // Marcar como leídos los mensajes del otro participante.
    await db.message.updateMany({
      where: { conversationId: id, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    })

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return NextResponse.json({ messages: messages.map((m) => toMessageDto(m, user.id)) })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    const { id } = await ctx.params
    checkRate(`msg:${user.id}`, 60, 60_000)

    const conv = await loadConversationFor(id, user.id)
    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const text = asString(body.body)?.trim() ?? ''
    if (!text) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 })
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'El mensaje es demasiado largo (máx. 2000).' }, { status: 400 })
    }

    const message = await db.message.create({
      data: { conversationId: id, senderId: user.id, body: text },
    })
    await db.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    })

    // Notifica al otro solo si no tenía mensajes míos sin leer (evita spam).
    const otherId = conv.clientId === user.id ? conv.courierId : conv.clientId
    const unreadFromMe = await db.message.count({
      where: { conversationId: id, senderId: user.id, readAt: null },
    })
    if (unreadFromMe <= 1) {
      await db.notification.create({
        data: {
          userId: otherId,
          category: 'mensaje',
          title: 'Nuevo mensaje',
          body: `${user.fullName}: ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`,
        },
      })
    }

    return NextResponse.json({ message: toMessageDto(message, user.id) })
  } catch (e) {
    return apiError(e)
  }
}
