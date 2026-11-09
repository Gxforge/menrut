// GET /api/admin/payments?status=pending|approved|rejected|all — Bandeja de
// solicitudes de pago (admin+propietario; el moderador NO puede ver pagos).
// Incluye datos del mensajero (nombre, email), plan y proofSignedUrl: URL
// firmada (10 min) generada con service_role para el bucket privado. Las
// proofUrl legacy que ya son URLs públicas se devuelven tal cual.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiError, asString, getSupabaseAdmin, requireAuth, requireRole } from '@/lib/auth-server'
import type { AdminPaymentDto } from '@/lib/types'

export const dynamic = 'force-dynamic'

const BUCKET = 'payment-proofs-private'
const SIGNED_URL_TTL = 600 // 10 minutos

const VALID_STATUSES = ['pending', 'approved', 'rejected']

// Genera URLs firmadas en lote para las rutas internas de comprobante.
async function signedUrlsFor(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const internal = paths.filter((p) => p && !p.startsWith('http'))
  if (internal.length === 0) return map
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrls(internal, SIGNED_URL_TTL)
  if (error) {
    console.error('[admin/payments] Error firmando URLs:', error)
    return map
  }
  for (const item of data ?? []) {
    if (item?.path && item.signedUrl) map.set(item.path, item.signedUrl)
  }
  return map
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req)
    requireRole(user, 'admin')

    const statusParam = asString(req.nextUrl.searchParams.get('status'))?.trim() ?? ''
    const where =
      statusParam && statusParam !== 'all' && VALID_STATUSES.includes(statusParam)
        ? { status: statusParam }
        : undefined

    const proofs = await db.paymentProof.findMany({
      where,
      include: { courier: { include: { user: true } }, plan: true },
      orderBy: { createdAt: 'desc' },
    })

    const signed = await signedUrlsFor(proofs.map((p) => p.proofUrl))

    const payments: AdminPaymentDto[] = proofs.map((p) => ({
      id: p.id,
      courierName: p.courier.user.fullName,
      courierEmail: p.courier.user.email,
      courierId: p.courierId,
      planName: p.plan?.name ?? null,
      planCode: p.plan?.code ?? null,
      amountCup: p.amountCup,
      confirmedAmountCup: p.confirmedAmountCup,
      method: p.method,
      reference: p.reference,
      proofUrl: p.proofUrl,
      proofSignedUrl: p.proofUrl
        ? p.proofUrl.startsWith('http')
          ? p.proofUrl // legacy: ya era una URL pública
          : signed.get(p.proofUrl) ?? null
        : null,
      hasProof: !!p.proofUrl,
      status: p.status,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    }))
    return NextResponse.json({ payments })
  } catch (e) {
    return apiError(e)
  }
}
