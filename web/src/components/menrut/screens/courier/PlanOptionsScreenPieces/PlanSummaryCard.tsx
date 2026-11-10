// MENRUT — PlanOptionsScreen · Tarjeta resumen del plan elegido y botón de
// solicitud de pago manual (Transfermóvil).
'use client'

import { Clock3, Crown, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCup } from '@/lib/format'
import type { PlanDto } from '@/lib/types'

interface PlanSummaryCardProps {
  selectedPlan: PlanDto
  monthsSel: number
  ahorro: number
  esPlanActual: boolean
  isPending: boolean
  onRequest: (plan: PlanDto) => void
}

export function PlanSummaryCard({
  selectedPlan,
  monthsSel,
  ahorro,
  esPlanActual,
  isPending,
  onRequest,
}: PlanSummaryCardProps) {
  const diasPermanencia = Math.round(selectedPlan.permanenceCredits / 10)

  return (
    <article
      aria-label={`Plan ${selectedPlan.name}`}
      className={cn(
        'mt-4 rounded-2xl border bg-card p-5',
        esPlanActual ? 'border-blue/50 bg-blue/5' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-bold leading-tight">
            {selectedPlan.name}
          </h2>
          {selectedPlan.description ? (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {selectedPlan.description}
            </p>
          ) : null}
        </div>
        {esPlanActual ? (
          <span className="shrink-0 rounded-full bg-blue px-2.5 py-1 text-[10.5px] font-bold text-white">
            Tu plan
          </span>
        ) : null}
      </div>

      <div className="mt-3.5 flex items-baseline gap-2">
        <p className="font-display text-[26px] font-bold leading-none">
          {formatCup(selectedPlan.priceCup)}
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-navy">
          {monthsSel} {monthsSel === 1 ? 'mes' : 'meses'}
        </span>
      </div>
      {ahorro > 0 ? (
        <p className="mt-1.5 text-[12px] font-semibold text-success">
          Ahorras {ahorro.toLocaleString('es-CU')} CUP frente a pagar mes a mes.
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        <li className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" aria-hidden />
          {selectedPlan.permanenceCredits} créditos de permanencia
          {diasPermanencia > 0 && (
            <>
              {' '}(≈ {diasPermanencia} {diasPermanencia === 1 ? 'día' : 'días'})
            </>
          )}
        </li>
        <li className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
          {selectedPlan.toolCredits > 0
            ? `${selectedPlan.toolCredits} créditos de herramientas`
            : 'Sin créditos de herramientas'}
        </li>
      </ul>

      <Button
        className="mt-4 h-12 w-full rounded-full text-[15px] font-bold"
        disabled={isPending}
        onClick={() => onRequest(selectedPlan)}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Abriendo solicitud…
          </>
        ) : (
          <>
            <Crown className="h-5 w-5" aria-hidden />
            Solicitar este plan
          </>
        )}
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
        Pagas por Transfermóvil y el propietario confirma tu transferencia.
      </p>
    </article>
  )
}
