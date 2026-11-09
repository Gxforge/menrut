// GET /api/tools — Herramientas activas (catálogo público).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/lib/auth-server'
import { toToolDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tools = await db.tool.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(
      { tools: tools.map(toToolDto) },
      { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } },
    )
  } catch (e) {
    return apiError(e)
  }
}
