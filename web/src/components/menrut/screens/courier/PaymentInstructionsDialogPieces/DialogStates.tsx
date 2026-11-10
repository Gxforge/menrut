// MENRUT — PaymentInstructionsDialog · Estados de solo lectura de la
// solicitud: aprobada, rechazada y en revisión (captura ya enviada).
'use client'

import { CheckCircle2, Clock, ImageUp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatCup } from '@/lib/format'
import type { PaymentProofDto } from '@/lib/types'

// ── Solicitud aprobada ──
export function ApprovedPanel({
  current,
  amount,
  planName,
  months,
  onClose,
}: {
  current: PaymentProofDto
  amount: number
  planName: string
  months: number | null
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Pago confirmado</DialogTitle>
        <DialogDescription>
          {planName} · {months ? `${months} ${months === 1 ? 'mes' : 'meses'} · ` : ''}
          {formatCup(current.confirmedAmountCup ?? amount)} confirmados.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-success/10 px-4 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <p className="font-display text-[15px] font-bold">Plan activado</p>
        <p className="max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
          El propietario confirmó tu transferencia. Tu membresía y tus créditos ya están acreditados.
        </p>
      </div>
      <Button variant="outline" className="h-11 w-full rounded-full" onClick={onClose}>
        Cerrar
      </Button>
    </>
  )
}

// ── Solicitud rechazada ──
export function RejectedPanel({
  current,
  amount,
  planName,
  onClose,
}: {
  current: PaymentProofDto
  amount: number
  planName: string
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Solicitud rechazada</DialogTitle>
        <DialogDescription>{planName} · {formatCup(amount)}.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger/10 px-4 py-8 text-center">
        <XCircle className="h-10 w-10 text-danger" aria-hidden />
        <p className="font-display text-[15px] font-bold">El propietario no pudo confirmar tu pago</p>
        {current.reviewNote ? (
          <p className="max-w-[280px] rounded-xl bg-card px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
            «{current.reviewNote}»
          </p>
        ) : (
          <p className="max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
            Revisa el motivo y vuelve a solicitar el plan cuando lo tengas todo listo.
          </p>
        )}
      </div>
      <Button variant="outline" className="h-11 w-full rounded-full" onClick={onClose}>
        Cerrar
      </Button>
    </>
  )
}

// ── En revisión: captura ya enviada ──
export function ReviewPanel({
  planName,
  months,
  amount,
  method,
  uploadPending,
  onChangeCapture,
  onClose,
}: {
  planName: string
  months: number | null
  amount: number
  method: string
  uploadPending: boolean
  onChangeCapture: () => void
  onClose: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Solicitud en revisión</DialogTitle>
        <DialogDescription>
          {planName} · {months ? `${months} ${months === 1 ? 'mes' : 'meses'} · ` : ''}
          {formatCup(amount)} por {method}.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-orange/10 px-4 py-8 text-center">
        <Clock className="h-10 w-10 text-orange" aria-hidden />
        <p className="font-display text-[15px] font-bold">En revisión</p>
        <p className="max-w-[290px] text-[12.5px] leading-relaxed text-muted-foreground">
          El propietario verificará tu transferencia y activará tu plan.
        </p>
      </div>
      <Button
        variant="outline"
        className="h-11 w-full rounded-full"
        disabled={uploadPending}
        onClick={onChangeCapture}
      >
        <ImageUp className="h-4 w-4" aria-hidden />
        Cambiar la captura
      </Button>
      <Button className="h-11 w-full rounded-full" onClick={onClose}>
        Entendido
      </Button>
    </>
  )
}
