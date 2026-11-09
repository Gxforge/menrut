// GET /api/admin/accounts — Todas las cuentas con sus reportes emitidos.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireRole } from '@/lib/auth-server'
import type { AdminAccountDto, Role } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } })
    const reportCounts = await db.reportFlag.groupBy({
      by: ['reporterId'],
      _count: { _all: true },
    })
    const reportsByUser = new Map(reportCounts.map((r) => [r.reporterId, r._count._all]))

    const accounts: AdminAccountDto[] = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role as Role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      reportsCount: reportsByUser.get(u.id) ?? 0,
    }))
    return NextResponse.json({ accounts })
  } catch (e) {
    return apiError(e)
  }
}
