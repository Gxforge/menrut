// MENRUT — Piezas de AdminPaymentsScreen: tarjeta de solicitud de pago
// (chip de estado, miniatura del comprobante y datos del pago).
'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { formatCup, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import type { AdminPaymentDto } from '@/lib/types'

export function StatusChip({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
        Aprobada
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
        Rechazada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
      Pendiente
    </span>
  )
}

// Miniatura del comprobante: botón que amplía en un diálogo; «Sin captura» si
// no existe o si la URL firmada (10 min) caducó o falló.
export function ProofThumb({
  payment,
  onOpen,
}: {
  payment: AdminPaymentDto
  onOpen: (p: AdminPaymentDto) => void
}) {
  const [failed, setFailed] = useState(false)
  const url = payment.proofSignedUrl

  if (!payment.hasProof || !url || failed) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-muted/60 px-1 text-center"
        title={payment.hasProof ? 'Comprobante no disponible (refresca la lista)' : 'El mensajero no ha subido captura'}
      >
        <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
        <span className="text-[9px] leading-tight text-muted-foreground">
          {payment.hasProof ? 'No disponible' : 'Sin captura'}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(payment)}
      className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-muted transition-transform active:scale-95"
      aria-label={`Ampliar comprobante de pago de ${payment.courierName}`}
      title="Ampliar comprobante"
    >
      {/* URL firmada externa (bucket privado): img directo, carga diferida */}
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </button>
  )
}

export function PaymentCard({
  payment,
  deciding,
  onOpen,
  onReview,
}: {
  payment: AdminPaymentDto
  deciding: boolean
  onOpen: (p: AdminPaymentDto) => void
  onReview: (p: AdminPaymentDto) => void
}) {
  const p = payment
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <ProofThumb payment={p} onOpen={onOpen} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[14.5px] font-bold leading-tight">
                {p.courierName}
              </h3>
              <p className="truncate text-[11.5px] text-muted-foreground">{p.courierEmail}</p>
            </div>
            <StatusChip status={p.status} />
          </div>
          <dl className="mt-1.5 space-y-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            <div className="flex gap-1.5">
              <dt className="shrink-0 font-medium">Plan:</dt>
              <dd className="truncate font-semibold text-foreground/90">
                {p.planName ?? 'No especificado'}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="shrink-0 font-medium">Solicitado:</dt>
              <dd className="truncate font-semibold text-foreground/90">
                {formatCup(p.amountCup)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="shrink-0 font-medium">Fecha:</dt>
              <dd className="truncate">{formatDateTime(p.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {p.status === 'approved' && p.confirmedAmountCup !== null ? (
        <p className="mt-2.5 rounded-xl bg-success/10 px-3 py-2 text-[11.5px] font-medium text-success">
          Recibido: {formatCup(p.confirmedAmountCup)}
          {p.reviewNote ? ` · «${p.reviewNote}»` : ''}
        </p>
      ) : null}
      {p.status === 'rejected' && p.reviewNote ? (
        <p className="mt-2.5 rounded-xl bg-danger/10 px-3 py-2 text-[11.5px] leading-relaxed text-danger">
          Motivo: {p.reviewNote}
        </p>
      ) : null}

      {p.status === 'pending' ? (
        <Button
          className="mt-3 h-11 w-full rounded-full font-semibold"
          disabled={deciding}
          onClick={() => onReview(p)}
        >
          Revisar
        </Button>
      ) : null}
    </article>
  )
}
