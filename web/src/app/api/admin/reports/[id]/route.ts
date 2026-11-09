// PATCH /api/admin/reports/[id] — Marca un reporte como revisado o descartado (auditado).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'moderator')
    const { id } = await ctx.params

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const status = asString(body.status) ?? ''
    if (status !== 'reviewed' && status !== 'dismissed') {
      throw new HttpError(400, 'Estado no válido.')
    }

    const report = await db.reportFlag.findUnique({ where: { id } })
    if (!report) throw new HttpError(404, 'Reporte no encontrado.')

    await db.reportFlag.update({ where: { id }, data: { status } })
    await audit(
      user.id,
      'report.resolved',
      'ReportFlag',
      id,
      `Reporte de ${report.targetType} marcado como ${status}.`,
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
