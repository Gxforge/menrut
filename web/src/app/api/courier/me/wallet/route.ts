// GET /api/courier/me/wallet — Cartera real con reconciliación de permanencia.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, HttpError, reconcileWallet, requireAuth, requireExactRole } from '@/lib/auth-server'
import { activeMembershipWhere, toWalletDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    // Reconciliación lazy (regla 8.3): consume créditos por tiempo transcurrido.
    await reconcileWallet(profile.id)
    const [wallet, membership, transactions, freshProfile] = await Promise.all([
      db.wallet.findUnique({ where: { courierId: profile.id } }),
      db.membership.findFirst({
        where: activeMembershipWhere(profile.id),
        orderBy: { expiresAt: 'desc' },
        include: { plan: true },
      }),
      db.walletTransaction.findMany({
        where: { wallet: { courierId: profile.id } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.courierProfile.findUniqueOrThrow({ where: { id: profile.id } }),
    ])

    return NextResponse.json(
      toWalletDto(wallet, membership, freshProfile.isPublic, transactions),
    )
  } catch (e) {
    return apiError(e)
  }
}
