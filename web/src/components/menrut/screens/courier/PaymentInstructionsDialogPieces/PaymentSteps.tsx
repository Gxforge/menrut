// MENRUT — PaymentInstructionsDialog · Flujo activo de pago: cabecera,
// importe exacto, pasos a seguir y tarjeta de cobro (o aviso si no hay).
'use client'

import { Copy, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatCup } from '@/lib/format'
import type { PaymentInstructionsDto } from '@/lib/types'

interface PaymentStepsProps {
  amount: number
  planName: string
  months: number | null
  method: string
  card: string
  instructions: PaymentInstructionsDto | null
  onCopyCard: () => void
}

export function PaymentSteps({
  amount,
  planName,
  months,
  method,
  card,
  instructions,
  onCopyCard,
}: PaymentStepsProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Cómo pagar tu plan</DialogTitle>
        <DialogDescription>
          MENRUT no procesa pagos en línea. Transfiere por {method} y sube tu captura:
          el propietario confirmará tu transferencia y activará tu plan.
        </DialogDescription>
      </DialogHeader>

      {/* Resumen */}
      <div className="rounded-2xl bg-secondary/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Importe exacto a transferir
        </p>
        <p className="mt-1 font-display text-[26px] font-bold leading-none text-navy">
          {formatCup(amount)}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          {planName}
          {months ? ` · ${months} ${months === 1 ? 'mes' : 'meses'}` : ''} · {method}
        </p>
      </div>

      {/* Pasos */}
      <ol className="space-y-2.5 text-[12.5px] leading-relaxed text-foreground/90">
        <li className="flex gap-2.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
            aria-hidden
          >
            1
          </span>
          <span>
            Abre {method} y transfiere exactamente{' '}
            <strong className="font-semibold">{formatCup(amount)}</strong>
            {card ? (
              <> a la tarjeta <strong className="font-semibold">{card}</strong>.</>
            ) : (
              <> a la tarjeta de cobro de MENRUT.</>
            )}
          </span>
        </li>
        <li className="flex gap-2.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
            aria-hidden
          >
            2
          </span>
          <span>Guarda la captura de la transferencia.</span>
        </li>
        <li className="flex gap-2.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
            aria-hidden
          >
            3
          </span>
          <span>Súbela aquí para que el propietario confirme.</span>
        </li>
      </ol>

      {/* Tarjeta (grande, con copiar) — solo si el backend la suministró */}
      {card ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tarjeta {method}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="min-w-0 flex-1 font-display text-[19px] font-bold leading-tight tracking-[0.06em] break-all">
              {card}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-10 shrink-0 rounded-full px-4"
              onClick={onCopyCard}
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copiar
            </Button>
          </div>
          {instructions?.phone ? (
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              Teléfono: <span className="font-medium text-foreground/80">{instructions.phone}</span>
            </p>
          ) : null}
          {instructions?.note ? (
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{instructions.note}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-line bg-muted/40 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Los datos de cobro (tarjeta y teléfono) se muestran al abrir la solicitud. Si no los
            tienes a mano, escríbenos desde Ayuda y soporte.
          </p>
        </div>
      )}
    </>
  )
}
