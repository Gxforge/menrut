// GET /api/admin/system — Estado del sistema con datos verificables.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireRole } from '@/lib/auth-server'
import type { SystemStatusDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    let databaseOk = true
    let territories = 0
    let couriers = 0
    let users = 0
    let routes = 0
    let conversations = 0
    let notifications = 0
    let auditEvents = 0
    let demoCouriers = 0

    try {
      ;[
        territories,
        couriers,
        users,
        routes,
        conversations,
        notifications,
        auditEvents,
        demoCouriers,
      ] = await Promise.all([
        db.municipality.count(),
        db.courierProfile.count(),
        db.user.count(),
        db.route.count(),
        db.conversation.count(),
        db.notification.count(),
        db.auditLog.count(),
        db.courierProfile.count({ where: { isDemo: true } }),
      ])
    } catch {
      databaseOk = false
    }

    const demoShare = couriers > 0 ? Math.round((demoCouriers / couriers) * 1000) / 10 : 0

    const dto: SystemStatusDto = {
      databaseOk,
      territories,
      couriers,
      users,
      routes,
      conversations,
      notifications,
      auditEvents,
      demoShare,
      reconciliation: null,
    }
    return NextResponse.json(dto)
  } catch (e) {
    return apiError(e)
  }
}
