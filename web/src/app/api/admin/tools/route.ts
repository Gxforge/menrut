// POST /api/admin/tools — Crea o actualiza una herramienta por código (auditado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asBool, asInt, asString, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'
import { toToolDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const code = asString(body.code)?.trim() ?? ''
    const name = asString(body.name)?.trim() ?? ''
    if (!code) throw new HttpError(400, 'La herramienta necesita un código.')
    if (!name) throw new HttpError(400, 'La herramienta necesita un nombre.')

    const description = asString(body.description)?.trim() ?? ''
    const tag = asString(body.tag)?.trim() || 'BÁSICO'
    const minPlanCodeRaw = body.minPlanCode
    const minPlanCode =
      minPlanCodeRaw === null || minPlanCodeRaw === undefined || minPlanCodeRaw === ''
        ? null
        : asString(minPlanCodeRaw)?.trim() ?? null
    const creditCost = asInt(body.creditCost)
    if (creditCost === null || creditCost < 0) {
      throw new HttpError(400, 'El coste en créditos no es válido.')
    }
    const requiresActiveMembership = asBool(body.requiresActiveMembership) ?? true
    const isActive = asBool(body.isActive) ?? true
    const blockedMessage = asString(body.blockedMessage)?.trim() ?? ''
    const sortOrder = asInt(body.sortOrder) ?? 99

    const tool = await db.tool.upsert({
      where: { code },
      create: {
        code,
        name,
        description,
        tag,
        minPlanCode,
        creditCost,
        requiresActiveMembership,
        isActive,
        blockedMessage,
        sortOrder,
      },
      update: {
        name,
        description,
        tag,
        minPlanCode,
        creditCost,
        requiresActiveMembership,
        isActive,
        blockedMessage,
        sortOrder,
      },
    })

    await audit(
      user.id,
      'tool.upsert',
      'Tool',
      tool.id,
      `Herramienta ${tool.code} (${tool.name}) guardada.`,
    )
    return NextResponse.json({ tool: toToolDto(tool) })
  } catch (e) {
    return apiError(e)
  }
}
