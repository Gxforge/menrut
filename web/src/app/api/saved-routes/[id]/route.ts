// DELETE /api/saved-routes/[id] — Elimina una ruta guardada propia (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    const { id } = await ctx.params
    const route = await db.savedRoute.findUnique({ where: { id } })
    if (!route || route.userId !== user.id) {
      return NextResponse.json({ error: 'Ruta guardada no encontrada.' }, { status: 404 })
    }
    await db.savedRoute.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
