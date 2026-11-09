// PATCH /api/me — Actualiza fullName / phone / avatarUrl del usuario autenticado.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, requireAuth } from '@/lib/auth-server'
import { toSessionUser } from '@/lib/dto'
import type { User } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const patch: Partial<User> = {}
    if ('fullName' in body) {
      const fullName = asString(body.fullName)?.trim() ?? ''
      if (!fullName) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 })
      }
      if (fullName.length > 80) {
        return NextResponse.json({ error: 'El nombre es demasiado largo.' }, { status: 400 })
      }
      patch.fullName = fullName
    }
    if ('phone' in body) {
      const phone = body.phone
      if (phone === null || phone === '') {
        patch.phone = null
      } else {
        const p = asString(phone)?.trim() ?? ''
        if (p && !/^[+0-9\s()-]{5,25}$/.test(p)) {
          return NextResponse.json({ error: 'El teléfono no tiene un formato válido.' }, { status: 400 })
        }
        patch.phone = p || null
      }
    }
    if ('avatarUrl' in body) {
      const avatar = body.avatarUrl
      if (avatar === null || avatar === '') {
        patch.avatarUrl = null
      } else {
        const a = asString(avatar)?.trim() ?? ''
        if (a.length > 500) {
          return NextResponse.json({ error: 'La URL del avatar es demasiado larga.' }, { status: 400 })
        }
        patch.avatarUrl = a || null
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 })
    }

    const updated = await db.user.update({ where: { id: user.id }, data: patch })
    return NextResponse.json({ user: toSessionUser(updated) })
  } catch (e) {
    return apiError(e)
  }
}
