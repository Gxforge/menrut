// GET /api/admin/overview — Métricas reales para el panel de administración.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireRole } from '@/lib/auth-server'
import type { AdminOverviewDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      couriersTotal,
      couriersVerified,
      couriersPending,
      couriersHidden,
      clientsTotal,
      routesActive,
      routesScheduled,
      paymentsPending,
      paymentsApprovedThisMonth,
      reportsOpen,
      demoCouriers,
    ] = await Promise.all([
      db.courierProfile.count(),
      db.courierProfile.count({ where: { verificationStatus: 'verified' } }),
      db.courierProfile.count({ where: { verificationStatus: 'pending' } }),
      db.courierProfile.count({ where: { isPublic: false } }),
      db.user.count({ where: { role: { in: ['client', 'business'] } } }),
      db.route.count({ where: { status: 'active' } }),
      db.route.count({ where: { status: 'scheduled' } }),
      db.paymentProof.count({ where: { status: 'pending' } }),
      db.paymentProof.count({
        where: { status: 'approved', reviewedAt: { gte: monthStart } },
      }),
      db.reportFlag.count({ where: { status: 'open' } }),
      db.courierProfile.count({ where: { isDemo: true } }),
    ])

    const dto: AdminOverviewDto = {
      couriers: {
        total: couriersTotal,
        verified: couriersVerified,
        pending: couriersPending,
        hidden: couriersHidden,
      },
      clients: { total: clientsTotal },
      routes: { active: routesActive, scheduled: routesScheduled },
      payments: { pending: paymentsPending, approvedThisMonth: paymentsApprovedThisMonth },
      reports: { open: reportsOpen },
      demoCouriers,
    }
    return NextResponse.json(dto)
  } catch (e) {
    return apiError(e)
  }
}
