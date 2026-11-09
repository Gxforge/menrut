// GET /api/plans — Planes activos (catálogo público), ordenados por nivel
// comercial (trial → básico → profesional → destacado) y duración ascendente.
// `isTrial` permite excluir la prueba gratuita del flujo de compra.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/lib/auth-server'
import { planTier, toPlanDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

const TIER_ORDER = { trial: 0, basic: 1, pro: 2, featured: 3 } as const

export async function GET() {
  try {
    const plans = await db.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    const sorted = [...plans].sort((a, b) => {
      const ta = TIER_ORDER[planTier(a)]
      const tb = TIER_ORDER[planTier(b)]
      return ta - tb || a.durationDays - b.durationDays || a.priceCup - b.priceCup
    })
    return NextResponse.json(
      { plans: sorted.map(toPlanDto) },
      { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
    )
  } catch (e) {
    return apiError(e)
  }
}
