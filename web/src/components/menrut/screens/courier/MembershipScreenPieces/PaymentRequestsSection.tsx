// MENRUT — MembershipScreen · «Mis solicitudes de pago»: historial
// Transfermóvil con estado y subida de captura si falta.
'use client'

import { Coins, ImageUp, Receipt, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCup, formatDateTime } from '@/lib/format'
import type { PaymentProofDto } from '@/lib/types'
import { PaymentStatusPill } from './PaymentStatusPill'

interface PaymentRequestsSectionProps {
  isLoading: boolean
  isError: boolean
  pagos: PaymentProofDto[]
  onRetry: () => void
  onUpload: (p: PaymentProofDto) => void
  onCancel: (p: PaymentProofDto) => void
  cancelling?: boolean
}

export function PaymentRequestsSection({
  isLoading,
  isError,
  pagos,
  onRetry,
  onUpload,
  onCancel,
  cancelling = false,
}: PaymentRequestsSectionProps) {
  return (
    <section className="mt-4" aria-label="Mis solicitudes de pago">
      <h2 className="section-title mb-2.5 flex items-center gap-1.5">
        <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
        Mis solicitudes de pago
      </h2>
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-center">
          <p className="text-[13px] text-muted-foreground">
            No se pudo cargar tus solicitudes de pago.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-9 rounded-full"
            onClick={onRetry}
          >
            Reintentar
          </Button>
        </div>
      ) : pagos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] leading-relaxed text-muted-foreground">
          Todavía no has solicitado un plan de pago. Cuando lo hagas, seguirás aquí su estado.
        </p>
      ) : (
        <div className="max-h-96 divide-y divide-line overflow-y-auto nice-scroll rounded-2xl border border-line bg-card">
          {pagos.map((p) => (
            <div key={p.id} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    p.status === 'approved'
                      ? 'bg-success/10 text-success'
                      : p.status === 'rejected'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-orange/10 text-orange',
                  )}
                  aria-hidden
                >
                  <Coins className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold leading-tight">
                    {p.planName ?? 'Plan'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatCup(p.amountCup)} · {formatDateTime(p.createdAt)}
                  </p>
                </div>
                <PaymentStatusPill status={p.status} />
              </div>

              {p.status === 'approved' && p.confirmedAmountCup !== null ? (
                <p className="mt-1.5 text-[11.5px] font-medium text-success">
                  Cantidad confirmada: {formatCup(p.confirmedAmountCup)}
                </p>
              ) : null}
              {p.status === 'rejected' && p.reviewNote ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-danger">
                  Motivo: {p.reviewNote}
                </p>
              ) : null}
              {p.status === 'pending' ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {p.hasProof
                    ? 'Captura enviada. El propietario confirmará tu transferencia y activará tu plan.'
                    : 'Falta subir la captura de la transferencia para que el propietario la revise.'}
                </p>
              ) : null}

              {p.status === 'pending' && !p.hasProof ? (
                <Button
                  size="sm"
                  className="mt-2 h-9 rounded-full px-4"
                  onClick={() => onUpload(p)}
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                  Subir captura
                </Button>
              ) : null}

              {p.status === 'pending' && !p.hasProof ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 ml-2 h-9 rounded-full px-4 text-danger"
                  disabled={cancelling}
                  onClick={() => onCancel(p)}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Cancelar solicitud
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
