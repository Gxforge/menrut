// GET /api/admin/moderation — Reportes abiertos/revisados + auditoría reciente.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth, requireRole } from '@/lib/auth-server'
import type { AuditLogDto, ReportFlagDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'moderator')

    const [reports, auditLogs] = await Promise.all([
      db.reportFlag.findMany({
        include: { reporter: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.auditLog.findMany({
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const reportDtos: ReportFlagDto[] = reports.map((r) => ({
      id: r.id,
      reporterName: r.reporter.fullName,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))

    const auditDtos: AuditLogDto[] = auditLogs.map((a) => ({
      id: a.id,
      actorName: a.actor?.fullName ?? 'Sistema',
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    }))

    return NextResponse.json({ reports: reportDtos, audit: auditDtos })
  } catch (e) {
    return apiError(e)
  }
}
