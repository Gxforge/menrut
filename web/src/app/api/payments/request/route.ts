// POST /api/payments/request — El mensajero elige un plan y abre una solicitud
// de pago manual por Transfermóvil. Devuelve las instrucciones de pago leídas
// de PlatformConfig (nunca hardcodeadas) + el comprobante creado (pending).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  apiError,
  asString,
  audit,
  checkRate,
  HttpError,
  requireAuth,
  requireExactRole,
} from '@/lib/auth-server'
import { toPaymentProofDto } from '@/lib/dto'
import type { PaymentInstructionsDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Instrucciones de cobro reales (PlatformConfig); falla si no están sembradas.
async function readPaymentInstructions(amountCup: number, planName: string): Promise<PaymentInstructionsDto> {
  const rows = await db.platformConfig.findMany({
    where: { key: { in: ['payment_method', 'payment_card', 'payment_phone', 'payment_note'] } },
  })
  const cfg = new Map(rows.map((r) => [r.key, r.value]))
  const method = cfg.get('payment_method') ?? ''
  const card = cfg.get('payment_card') ?? ''
  if (!method || !card) {
    throw new HttpError(500, 'La configuración de pago no está disponible. Contacta al soporte.')
  }
  return {
    method,
    card,
    phone: cfg.get('payment_phone') ?? '',
    note: cfg.get('payment_note') ?? '',
    amountCup,
    planName,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    checkRate(`payment-request:${user.id}`, 10, 60_000)

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const planId = asString(body.planId)?.trim() ?? ''
    if (!planId) throw new HttpError(400, 'Selecciona un plan.')

    const plan = await db.membershipPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      throw new HttpError(400, 'El plan seleccionado no está disponible.')
    }
    if (plan.isTrial) {
      throw new HttpError(400, 'La prueba gratuita no requiere pago: actívala desde tus membresías.')
    }

    // Una sola solicitud pendiente por mensajero.
    const pending = await db.paymentProof.findFirst({
      where: { courierId: profile.id, status: 'pending' },
    })
    if (pending) {
      throw new HttpError(409, 'Ya tienes una solicitud en revisión.')
    }

    const proof = await db.paymentProof.create({
      data: {
        courierId: profile.id,
        submittedBy: user.id,
        planId: plan.id,
        amountCup: plan.priceCup, // snapshot del precio vigente
        method: 'transfermovil',
        status: 'pending',
      },
      include: { plan: true },
    })

    const instructions = await readPaymentInstructions(plan.priceCup, plan.name)

    await audit(
      user.id,
      'payment.requested',
      'PaymentProof',
      proof.id,
      `Mensajero: ${user.fullName}. Plan: ${plan.name} (${plan.code}). Importe: ${plan.priceCup} CUP.`,
    )

    return NextResponse.json({ proof: toPaymentProofDto(proof), instructions })
  } catch (e) {
    return apiError(e)
  }
}
