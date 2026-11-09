// PATCH /api/admin/payments/[id] — Aprueba o rechaza un comprobante (regla 8.5).
// Al aprobar: membresía/renovación REAL (acumulativa `add`), créditos a las dos
// carteras, re-visibilidad del perfil si estaba oculto. Nota obligatoria e
// idempotencia (409 si ya fue revisado). Todo auditado.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')
    const { id } = await ctx.params

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const decision = asString(body.decision) ?? ''
    const note = asString(body.note)?.trim() ?? ''
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new HttpError(400, 'Decisión no válida.')
    }
    if (!note) {
      throw new HttpError(400, 'La nota de revisión es obligatoria.')
    }

    const proof = await db.paymentProof.findUnique({
      where: { id },
      include: { plan: true, courier: { include: { user: true } } },
    })
    if (!proof) throw new HttpError(404, 'Comprobante no encontrado.')
    if (proof.status !== 'pending') {
      throw new HttpError(409, 'Este comprobante ya fue revisado.')
    }

    if (decision === 'rejected') {
      await db.paymentProof.update({
        where: { id },
        data: { status: 'rejected', reviewNote: note, reviewedBy: user.id, reviewedAt: new Date() },
      })
      await db.notification.create({
        data: {
          userId: proof.courier.user.id,
          category: 'membresia',
          title: 'Pago rechazado',
          body: `Tu comprobante fue rechazado. ${note}`,
        },
      })
      await audit(
        user.id,
        'payment.rejected',
        'PaymentProof',
        id,
        `Mensajero: ${proof.courier.user.fullName}. Nota: ${note}`,
      )
      return NextResponse.json({ ok: true })
    }

    // ─── Aprobación ───
    if (!proof.plan) {
      throw new HttpError(400, 'El comprobante no tiene un plan asociado; no se puede aprobar.')
    }
    const plan = proof.plan
    const now = new Date()

    // Membresía del courier con este plan: renovación acumulativa (add).
    const existing = await db.membership.findFirst({
      where: { courierId: proof.courierId, planId: plan.id, status: 'active' },
      orderBy: { expiresAt: 'desc' },
    })
    let expiresAt: Date
    if (existing && existing.expiresAt.getTime() > now.getTime()) {
      expiresAt = new Date(existing.expiresAt.getTime() + plan.durationDays * DAY_MS)
      await db.membership.update({
        where: { id: existing.id },
        data: { expiresAt, status: 'active' },
      })
    } else if (existing) {
      expiresAt = new Date(now.getTime() + plan.durationDays * DAY_MS)
      await db.membership.update({
        where: { id: existing.id },
        data: { expiresAt, status: 'active' },
      })
    } else {
      expiresAt = new Date(now.getTime() + plan.durationDays * DAY_MS)
      await db.membership.create({
        data: {
          courierId: proof.courierId,
          planId: plan.id,
          startedAt: now,
          expiresAt,
          status: 'active',
        },
      })
    }

    // Carteras separadas (regla 8.1): permanencia y herramientas.
    const wallet = await db.wallet.upsert({
      where: { courierId: proof.courierId },
      create: { courierId: proof.courierId },
      update: {},
    })
    if (plan.permanenceCredits > 0) {
      const after = wallet.permanenceCredits + plan.permanenceCredits
      await db.wallet.update({
        where: { id: wallet.id },
        data: { permanenceCredits: after },
      })
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          walletType: 'permanence',
          actorId: user.id,
          reason: `Membresía ${plan.name}`,
          reference: proof.reference || null,
          balanceBefore: wallet.permanenceCredits,
          delta: plan.permanenceCredits,
          balanceAfter: after,
        },
      })
    }
    if (plan.toolCredits > 0) {
      const after = wallet.toolCredits + plan.toolCredits
      await db.wallet.update({
        where: { id: wallet.id },
        data: { toolCredits: after },
      })
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          walletType: 'tools',
          actorId: user.id,
          reason: `Membresía ${plan.name}`,
          reference: proof.reference || null,
          balanceBefore: wallet.toolCredits,
          delta: plan.toolCredits,
          balanceAfter: after,
        },
      })
    }

    // Si el perfil estaba oculto por falta de permanencia → volver a público.
    if (!proof.courier.isPublic) {
      await db.courierProfile.update({
        where: { id: proof.courierId },
        data: { isPublic: true, updatedAt: now },
      })
      await db.wallet.update({
        where: { id: wallet.id },
        data: { lastConsumedAt: now },
      })
    }

    await db.paymentProof.update({
      where: { id },
      data: { status: 'approved', reviewNote: note, reviewedBy: user.id, reviewedAt: now },
    })
    await db.notification.create({
      data: {
        userId: proof.courier.user.id,
        category: 'membresia',
        title: 'Pago aprobado',
        body: `Tu membresía ${plan.name} fue activada hasta el ${expiresAt.toLocaleDateString('es-CU')}.`,
      },
    })
    await audit(
      user.id,
      'payment.approved',
      'PaymentProof',
      id,
      `Mensajero: ${proof.courier.user.fullName}. Plan: ${plan.name} (+${plan.permanenceCredits} permanencia, +${plan.toolCredits} herramientas). Vence: ${expiresAt.toISOString()}. Nota: ${note}`,
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
