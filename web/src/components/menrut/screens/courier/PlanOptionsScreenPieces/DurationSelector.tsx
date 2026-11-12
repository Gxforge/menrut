// MENRUT — PlanOptionsScreen · Selector de duración (1/3/6/12 meses) con el
// ahorro calculado en cliente frente a pagar mes a mes.
'use client'

import { cn } from '@/lib/utils'
import { formatCup } from '@/lib/format'
import type { PlanDto } from '@/lib/types'
import { monthsOf } from './helpers'

interface DurationSelectorProps {
  tierPlans: PlanDto[]
  monthsSel: number
  monthly: PlanDto | null
  onSelect: (m: number) => void
}

export function DurationSelector({ tierPlans, monthsSel, monthly, onSelect }: DurationSelectorProps) {
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-2"
      role="group"
      aria-label="Duración del plan"
    >
      {tierPlans.map((p) => {
        const m = monthsOf(p)
        const ahorroDur = monthly && m > 1 ? m * monthly.priceCup - p.priceCup : 0
        const activo = monthsSel === m
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(m)}
            aria-pressed={activo}
            className={cn(
              'rounded-2xl border p-3 text-left transition-all active:scale-95',
              activo
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-card hover:border-blue/40',
            )}
          >
            <p className="text-[12.5px] font-bold leading-tight">
              {m} {m === 1 ? 'mes' : 'meses'}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-[15px] font-bold leading-none',
                activo ? 'text-white' : 'text-foreground',
              )}
            >
              {formatCup(p.discountedPriceCup ?? p.priceCup)}
            </p>
            {ahorroDur > 0 ? (
              <p
                className={cn(
                  'mt-1 text-[10.5px] font-semibold leading-tight',
                  activo ? 'text-cyan' : 'text-success',
                )}
              >
                Ahorras {ahorroDur.toLocaleString('es-CU')} CUP
              </p>
            ) : (
              <p
                className={cn(
                  'mt-1 text-[10.5px] leading-tight',
                  activo ? 'text-white/70' : 'text-muted-foreground',
                )}
              >
                Pago único
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
