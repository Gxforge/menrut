// /api/admin/config — GET configuración global · POST upsert por clave (auditado).
// GET: admin+propietario. POST: claves de pago (payment_*) solo propietario;
// el resto de claves las puede guardar un admin.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, audit, HttpError, requireAuth, requireRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Claves que solo el propietario puede modificar (datos de cobro reales).
const OWNER_ONLY_KEYS = ['payment_method', 'payment_card', 'payment_phone', 'payment_note']

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const rows = await db.platformConfig.findMany()
    const config: Record<string, string> = {}
    for (const row of rows) config[row.key] = row.value
    return NextResponse.json({ config })
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const config = body.config
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new HttpError(400, 'Formato de configuración no válido.')
    }
    const entries = Object.entries(config as Record<string, unknown>).filter(
      ([k, v]) => typeof k === 'string' && k.trim().length > 0 && typeof v === 'string',
    ) as [string, string][]
    if (entries.length === 0) {
      throw new HttpError(400, 'No hay claves válidas que guardar.')
    }

    // Las claves de pago (tarjeta/método/teléfono/nota) solo las cambia el propietario.
    if (entries.some(([k]) => OWNER_ONLY_KEYS.includes(k))) {
      requireRole(user, 'owner')
    }

    for (const [key, value] of entries) {
      await db.platformConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    }
    await audit(
      user.id,
      'config.update',
      'PlatformConfig',
      'global',
      `Claves actualizadas: ${entries.map(([k]) => k).join(', ')}.`,
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
