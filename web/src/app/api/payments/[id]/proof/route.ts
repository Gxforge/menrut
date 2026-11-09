// POST /api/payments/[id]/proof — Sube la captura de la transferencia
// (multipart/form-data, campo `file`). La imagen va al bucket PRIVADO
// `payment-proofs-private` subida desde el backend con service_role (nunca
// desde el navegador) y en PaymentProof se guarda la RUTA interna.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  apiError,
  audit,
  checkRate,
  getSupabaseAdmin,
  HttpError,
  requireAuth,
  requireExactRole,
} from '@/lib/auth-server'
import { toPaymentProofDto } from '@/lib/dto'

export const dynamic = 'force-dynamic'

const BUCKET = 'payment-proofs-private'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuth(req)
    requireExactRole(user, 'courier')
    checkRate(`payment-proof:${user.id}`, 10, 60_000)
    const { id } = await ctx.params

    const profile = await db.courierProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.')
    }

    const proof = await db.paymentProof.findUnique({ where: { id }, include: { plan: true } })
    if (!proof || proof.courierId !== profile.id) {
      throw new HttpError(404, 'Solicitud de pago no encontrada.')
    }
    if (proof.status !== 'pending') {
      throw new HttpError(409, 'Esta solicitud ya fue revisada y no admite más comprobantes.')
    }

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!file || typeof file === 'string') {
      throw new HttpError(400, 'Adjunta la captura de la transferencia (imagen JPG, PNG o WebP).')
    }
    const contentType = file.type || ''
    const ext = ALLOWED_TYPES[contentType]
    if (!ext) {
      throw new HttpError(400, 'Formato no válido: sube una imagen JPG, PNG o WebP.')
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      throw new HttpError(400, 'La imagen supera el tamaño máximo de 5 MB.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const path = `proofs/${profile.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${ext}`

    const supabase = getSupabaseAdmin()
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) {
      console.error('[payments/proof] Error subiendo comprobante:', uploadError)
      throw new HttpError(500, 'No se pudo subir la captura. Inténtalo de nuevo.')
    }

    // Si reemplaza una captura anterior, se elimina del bucket (best-effort).
    if (proof.proofUrl) {
      await supabase.storage.from(BUCKET).remove([proof.proofUrl]).catch(() => undefined)
    }

    const updated = await db.paymentProof.update({
      where: { id: proof.id },
      data: { proofUrl: path }, // se guarda la RUTA, no una URL pública
      include: { plan: true },
    })

    await audit(
      user.id,
      'payment.proof_uploaded',
      'PaymentProof',
      proof.id,
      `Mensajero: ${user.fullName}. Archivo: ${path} (${file.size} bytes).`,
    )

    return NextResponse.json({ proof: toPaymentProofDto(updated) })
  } catch (e) {
    return apiError(e)
  }
}
