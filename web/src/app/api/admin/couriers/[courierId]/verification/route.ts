// PATCH /api/admin/couriers/[courierId]/verification — Aprueba o rechaza la
// verificación de un mensajero (nota OBLIGATORIA, todo auditado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ courierId: string }> },
) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')
    const { courierId } = await ctx.params

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const decision = asString(body.decision) ?? ''
    const note = asString(body.note)?.trim() ?? ''
    if (decision !== 'verified' && decision !== 'rejected') {
      throw new HttpError(400, 'Decisión no válida.')
    }
    if (!note) {
      throw new HttpError(400, 'La nota de revisión es obligatoria.')
    }

    const profile = await db.courierProfile.findUnique({
      where: { id: courierId },
      include: { user: true },
    })
    if (!profile) throw new HttpError(404, 'Mensajero no encontrado.')

    await db.courierProfile.update({
      where: { id: courierId },
      data: { verificationStatus: decision },
    })

    // Resuelve la solicitud pendiente más reciente (si existe).
    const pending = await db.verificationRequest.findFirst({
      where: { courierId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
    if (pending) {
      await db.verificationRequest.update({
        where: { id: pending.id },
        data: {
          status: decision === 'verified' ? 'approved' : 'rejected',
          reviewedBy: user.id,
          reviewNote: note,
          reviewedAt: new Date(),
        },
      })
    }

    await db.notification.create({
      data: {
        userId: profile.user.id,
        category: 'admin',
        title: decision === 'verified' ? 'Verificación aprobada' : 'Verificación rechazada',
        body:
          decision === 'verified'
            ? `Tu identidad fue verificada por MENRUT. ${note}`
            : `Tu solicitud de verificación fue rechazada. ${note}`,
      },
    })
    await audit(
      user.id,
      `courier.verification.${decision}`,
      'CourierProfile',
      courierId,
      `Mensajero: ${profile.user.fullName}. Nota: ${note}`,
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
