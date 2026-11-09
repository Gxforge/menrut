// POST /api/admin/plans — Crea o actualiza un plan por código (auditado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asBool, asInt, asString, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'
import { toPlanDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const code = asString(body.code)?.trim() ?? ''
    const name = asString(body.name)?.trim() ?? ''
    if (!code) throw new HttpError(400, 'El plan necesita un código.')
    if (!name) throw new HttpError(400, 'El plan necesita un nombre.')

    const description = asString(body.description)?.trim() ?? ''
    const durationDays = asInt(body.durationDays)
    if (durationDays === null || durationDays <= 0) {
      throw new HttpError(400, 'La duración debe ser un número de días mayor que cero.')
    }
    const priceCup = asInt(body.priceCup)
    if (priceCup === null || priceCup < 0) throw new HttpError(400, 'Importe no válido.')
    const permanenceCredits = asInt(body.permanenceCredits)
    if (permanenceCredits === null || permanenceCredits < 0) {
      throw new HttpError(400, 'Créditos de permanencia no válidos.')
    }
    const toolCredits = asInt(body.toolCredits)
    if (toolCredits === null || toolCredits < 0) {
      throw new HttpError(400, 'Créditos de herramientas no válidos.')
    }
    const isActive = asBool(body.isActive) ?? true
    const isProposal = asBool(body.isProposal) ?? true
    const sortOrder = asInt(body.sortOrder) ?? 99

    const plan = await db.membershipPlan.upsert({
      where: { code },
      create: {
        code,
        name,
        description,
        durationDays,
        priceCup,
        permanenceCredits,
        toolCredits,
        isActive,
        isProposal,
        sortOrder,
      },
      update: {
        name,
        description,
        durationDays,
        priceCup,
        permanenceCredits,
        toolCredits,
        isActive,
        isProposal,
        sortOrder,
      },
    })

    await audit(
      user.id,
      'plan.upsert',
      'MembershipPlan',
      plan.id,
      `Plan ${plan.code} (${plan.name}) guardado.`,
    )
    return NextResponse.json({ plan: toPlanDto(plan) })
  } catch (e) {
    return apiError(e)
  }
}
