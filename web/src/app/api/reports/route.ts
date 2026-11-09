// POST /api/reports — Reporta un perfil, reseña o conversación (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, checkRate, requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const TARGET_TYPES = ['profile', 'review', 'conversation']

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    checkRate(`report:${user.id}`, 10, 60 * 60_000)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const targetType = asString(body.targetType)?.trim() ?? 'profile'
    const targetId = asString(body.targetId)?.trim() ?? ''
    const reason = asString(body.reason)?.trim() ?? ''

    if (!TARGET_TYPES.includes(targetType)) {
      return NextResponse.json({ error: 'Tipo de reporte no válido.' }, { status: 400 })
    }
    if (!targetId) {
      return NextResponse.json({ error: 'Falta el elemento a reportar.' }, { status: 400 })
    }
    if (reason.length < 5 || reason.length > 500) {
      return NextResponse.json(
        { error: 'Describe el motivo del reporte (entre 5 y 500 caracteres).' },
        { status: 400 },
      )
    }

    await db.reportFlag.create({
      data: { reporterId: user.id, targetType, targetId, reason },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
