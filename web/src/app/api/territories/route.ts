// GET /api/territories — Catálogo público de provincias y municipios.
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError } from '@/lib/auth-server'
import type { MunicipalityDto, ProvinceDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const provinces = await db.province.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { municipalities: { orderBy: { name: 'asc' } } },
    })
    const payload: ProvinceDto[] = provinces.map((p) => ({
      id: p.id,
      name: p.name,
      municipalities: p.municipalities.map(
        (m): MunicipalityDto => ({ id: m.id, name: m.name }),
      ),
    }))
    return NextResponse.json(
      { provinces: payload },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
    )
  } catch (e) {
    return apiError(e)
  }
}
