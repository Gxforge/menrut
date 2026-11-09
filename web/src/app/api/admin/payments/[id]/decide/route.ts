// POST /api/admin/payments/[id]/decide — Aprueba o rechaza una solicitud de
// pago (Transfermóvil). admin+propietario (el moderador NO puede).
// approve (idempotente, 409 si ya decidida): en UNA transacción —
//   · PaymentProof → approved + confirmedAmountCup (lo que llegó) + revisión
//   · Membership → nueva expiresAt = max(ahora, activa actual) + días del plan
//     (regla `add` acumulativa; la sustituida queda expired)
//   · Wallet → +permanenceCredits y +toolCredits con DOS WalletTransaction
//     (reason plan:{code}, actor = quien aprueba)
// reject: reviewNote obligatorio + Notification + AuditLog.
// El tiempo SIEMPRE es del servidor.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  apiError,
  asInt,
  asString,
  audit,
  HttpError,
  reconcileWallet,
  requireAuth,
  requireRole,
} from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')
    const { id } = await ctx.params

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = asString(body.action) ?? ''
    if (action !== 'approve' && action !== 'reject') {
      throw new HttpError(400, 'Acción no válida (approve o reject).')
    }

    const reviewNote = asString(body.reviewNote)?.trim() ?? ''
    let confirmedAmountCup: number | null = null
    if (body.confirmedAmountCup !== undefined && body.confirmedAmountCup !== null) {
      confirmedAmountCup = asInt(body.confirmedAmountCup)
      if (confirmedAmountCup === null || confirmedAmountCup < 0) {
        throw new HttpError(400, 'La cantidad confirmada debe ser un número entero positivo.')
      }
    }

    const proof = await db.paymentProof.findUnique({
      where: { id },
      include: { plan: true, courier: { include: { user: true } } },
    })
    if (!proof) throw new HttpError(404, 'Solicitud de pago no encontrada.')
    if (proof.status !== 'pending') {
      throw new HttpError(409, 'Ya fue decidida.')
    }
    if (action === 'reject' && !reviewNote) {
      throw new HttpError(400, 'El motivo del rechazo es obligatorio.')
    }
    if (action === 'approve' && !proof.plan) {
      throw new HttpError(400, 'La solicitud no tiene un plan asociado; no se puede aprobar.')
    }

    const now = new Date()

    // ─── Rechazo ───
    if (action === 'reject') {
      await db.paymentProof.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewNote,
          reviewedBy: user.id,
          reviewedAt: now,
        },
      })
      await db.notification.create({
        data: {
          userId: proof.courier.user.id,
          category: 'membresia',
          title: 'Solicitud rechazada',
          body: `Tu solicitud de pago del plan ${proof.plan?.name ?? '(sin plan)'} fue rechazada. Motivo: ${reviewNote}`,
        },
      })
      await audit(
        user.id,
        'payment.rejected',
        'PaymentProof',
        id,
        `Mensajero: ${proof.courier.user.fullName}. Plan: ${proof.plan?.name ?? '—'}. Importe: ${proof.amountCup} CUP. Motivo: ${reviewNote}`,
      )
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    // ─── Aprobación (transacción única) ───
    const plan = proof.plan!
    const courierId = proof.courierId

    const expiresAt = await db.$transaction(async (tx) => {
      // 1) Comprobante aprobado con la cantidad que el propietario declaró recibir.
      await tx.paymentProof.update({
        where: { id },
        data: {
          status: 'approved',
          confirmedAmountCup,
          reviewNote: reviewNote || null,
          reviewedBy: user.id,
          reviewedAt: now,
        },
      })

      // 2) Membresía: renovación acumulativa (add). La activa vigente se
      //    sustituye (queda expired) y la nueva vence max(ahora, vencimiento) + días.
      const current = await tx.membership.findFirst({
        where: { courierId, status: 'active', expiresAt: { gt: now } },
        orderBy: { expiresAt: 'desc' },
      })
      // Las membresías "activas" ya vencidas pasan a expired.
      await tx.membership.updateMany({
        where: { courierId, status: 'active', expiresAt: { lte: now } },
        data: { status: 'expired' },
      })
      const base = current && current.expiresAt.getTime() > now.getTime() ? current.expiresAt : now
      const newExpiresAt = new Date(base.getTime() + plan.durationDays * DAY_MS)
      if (current) {
        await tx.membership.update({
          where: { id: current.id },
          data: { status: 'expired' },
        })
      }
      await tx.membership.create({
        data: {
          courierId,
          planId: plan.id,
          startedAt: now,
          expiresAt: newExpiresAt,
          status: 'active',
        },
      })

      // 3) Carteras separadas: permanencia + herramientas con sus transacciones.
      const wallet = await tx.wallet.upsert({
        where: { courierId },
        create: { courierId },
        update: {},
      })
      const reason = `plan:${plan.code}`
      if (plan.permanenceCredits > 0) {
        const after = wallet.permanenceCredits + plan.permanenceCredits
        await tx.wallet.update({ where: { id: wallet.id }, data: { permanenceCredits: after } })
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            walletType: 'permanence',
            actorId: user.id,
            reason,
            reference: proof.reference || plan.code,
            balanceBefore: wallet.permanenceCredits,
            delta: plan.permanenceCredits,
            balanceAfter: after,
          },
        })
      }
      if (plan.toolCredits > 0) {
        const after = wallet.toolCredits + plan.toolCredits
        await tx.wallet.update({ where: { id: wallet.id }, data: { toolCredits: after } })
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            walletType: 'tools',
            actorId: user.id,
            reason,
            reference: proof.reference || plan.code,
            balanceBefore: wallet.toolCredits,
            delta: plan.toolCredits,
            balanceAfter: after,
          },
        })
      }

      // 4) Perfil oculto por permanencia agotada → vuelve a ser visible y el
      //    consumo de permanencia arranca desde ahora (sin descuento retroactivo).
      if (!proof.courier.isPublic) {
        await tx.courierProfile.update({
          where: { id: courierId },
          data: { isPublic: true },
        })
        await tx.wallet.update({ where: { id: wallet.id }, data: { lastConsumedAt: now } })
      }

      return newExpiresAt
    })

    // Reconciliación lazy para refrescar visibilidad/saldos con reloj del servidor.
    await reconcileWallet(courierId)

    const confirmed = confirmedAmountCup !== null ? confirmedAmountCup : proof.amountCup
    await db.notification.create({
      data: {
        userId: proof.courier.user.id,
        category: 'membresia',
        title: 'Plan activado',
        body: `Tu plan ${plan.name} está activo hasta el ${expiresAt.toLocaleDateString('es-CU')}. Cantidad confirmada: ${confirmed} CUP.`,
      },
    })
    await audit(
      user.id,
      'payment.approved',
      'PaymentProof',
      id,
      `Mensajero: ${proof.courier.user.fullName}. Plan: ${plan.name} (${plan.code}). Solicitado: ${proof.amountCup} CUP. Confirmado: ${confirmed} CUP. Vence: ${expiresAt.toISOString()}. Créditos: +${plan.permanenceCredits} permanencia, +${plan.toolCredits} herramientas.`,
    )

    return NextResponse.json({ ok: true, status: 'approved', expiresAt: expiresAt.toISOString() })
  } catch (e) {
    return apiError(e)
  }
}
