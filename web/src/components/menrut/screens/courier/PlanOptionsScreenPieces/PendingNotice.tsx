// MENRUT — PlanOptionsScreen · Aviso de solicitud de pago pendiente en revisión.
'use client'

import { Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCup } from '@/lib/format'
import type { PaymentProofDto } from '@/lib/types'

interface PendingNoticeProps {
  pendingPayment: PaymentProofDto
  onOpen: (p: PaymentProofDto) => void
}

export function PendingNotice({ pendingPayment, onOpen }: PendingNoticeProps) {
  return (
    <section
      aria-label="Solicitud en revisión"
      className="mb-4 rounded-2xl border border-orange/30 bg-orange/10 p-4"
    >
      <div className="flex items-start gap-2.5">
        <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-bold leading-snug">
            Tienes una solicitud en revisión
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {pendingPayment.planName ?? 'Plan'} · {formatCup(pendingPayment.amountCup)}
            {pendingPayment.hasProof
              ? ' · captura enviada'
              : ' · falta subir la captura'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 shrink-0 rounded-full"
          onClick={() => onOpen(pendingPayment)}
        >
          Ver
        </Button>
      </div>
    </section>
  )
}
