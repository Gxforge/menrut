// POST /api/courier/me/verification — Solicita verificación de identidad.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, checkRate, HttpError, requireAuth, requireExactRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    checkRate(`verification:${user.id}`, 5, 60 * 60_000)

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }
    if (profile.verificationStatus === 'verified') {
      throw new HttpError(400, 'Tu cuenta ya está verificada.')
    }
    const pending = await db.verificationRequest.findFirst({
      where: { courierId: profile.id, status: 'pending' },
    })
    if (pending) {
      throw new HttpError(409, 'Ya tienes una solicitud de verificación en revisión.')
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const note = asString(body.note)?.trim() ?? ''
    if (note.length < 10 || note.length > 500) {
      throw new HttpError(400, 'Explica brevemente tu actividad (entre 10 y 500 caracteres).')
    }
    const documentUrl = asString(body.documentUrl)?.trim() ?? ''
    if (documentUrl.length > 500) {
      throw new HttpError(400, 'La URL del documento es demasiado larga.')
    }

    await db.verificationRequest.create({
      data: { courierId: profile.id, documentUrl, note, status: 'pending' },
    })
    await db.courierProfile.update({
      where: { id: profile.id },
      data: { verificationStatus: 'pending' },
    })
    await db.notification.create({
      data: {
        userId: user.id,
        category: 'admin',
        title: 'Solicitud enviada',
        body: 'Tu solicitud de verificación está en revisión. Te notificaremos el resultado.',
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
