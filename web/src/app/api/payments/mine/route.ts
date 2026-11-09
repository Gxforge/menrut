// GET /api/payments/mine — Historial de solicitudes de pago del mensajero
// (desc por createdAt) con el plan incluido.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireExactRole } from '@/lib/auth-server'
import { toPaymentProofDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return NextResponse.json({ payments: [] })
    }

    const proofs = await db.paymentProof.findMany({
      where: { courierId: profile.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ payments: proofs.map(toPaymentProofDto) })
  } catch (e) {
    return apiError(e)
  }
}
