// POST /api/courier/me/membership — Envía comprobante de pago (pending) o
// activa directamente la prueba gratuita si aún no se ha usado.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  activateTrialPlan,
  apiError,
  asInt,
  asString,
  checkRate,
  HttpError,
  requireAuth,
  requireExactRole,
} from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    checkRate(`membership:${user.id}`, 10, 60_000)

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y volver a entrar.')
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const planCode = asString(body.planCode)?.trim() ?? ''
    if (!planCode) throw new HttpError(400, 'Selecciona un plan.')

    const plan = await db.membershipPlan.findUnique({ where: { code: planCode } })
    if (!plan || !plan.isActive) throw new HttpError(400, 'El plan seleccionado no está disponible.')

    // Prueba gratuita: activación directa, una sola vez por cuenta.
    if (plan.isTrial) {
      if (user.hasUsedTrial) {
        throw new HttpError(409, 'La prueba gratuita ya fue utilizada.')
      }
      await activateTrialPlan(user.id, profile.id)
      return NextResponse.json({ ok: true, status: 'active' })
    }

    const amountCup = asInt(body.amountCup)
    if (amountCup === null || amountCup < 0) {
      throw new HttpError(400, 'El importe debe ser un número entero positivo.')
    }
    const method = asString(body.method)?.trim() ?? ''
    if (!method) throw new HttpError(400, 'Indica el método de pago.')
    const reference = asString(body.reference)?.trim() ?? ''
    if (!reference) throw new HttpError(400, 'Indica la referencia de la transferencia.')
    const proofUrl = asString(body.proofUrl)?.trim() ?? ''
    if (proofUrl.length > 500) throw new HttpError(400, 'La URL del comprobante es demasiado larga.')

    await db.paymentProof.create({
      data: {
        courierId: profile.id,
        submittedBy: user.id,
        planId: plan.id,
        amountCup,
        method,
        reference,
        proofUrl,
        status: 'pending',
      },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        category: 'membresia',
        title: 'Comprobante recibido',
        body: `Tu pago del plan ${plan.name} está en revisión. Te avisaremos en cuanto se apruebe.`,
      },
    })
    return NextResponse.json({ ok: true, status: 'pending' })
  } catch (e) {
    return apiError(e)
  }
}
