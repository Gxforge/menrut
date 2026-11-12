// MENRUT — PlanOptionsScreen · Selector de nivel del plan (Básico/Profesional/Destacado).
'use client'

import { cn } from '@/lib/utils'
import { formatCup } from '@/lib/format'
import type { PlanDto } from '@/lib/types'
import { TIERS, monthsOf, type TierId } from './helpers'

interface TierSelectorProps {
  tier: TierId
  byTier: Map<TierId, PlanDto[]>
  onSelect: (id: TierId) => void
}

export function TierSelector({ tier, byTier, onSelect }: TierSelectorProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label="Nivel del plan"
    >
      {TIERS.map(({ id, label, icon: Icon }) => {
        const plans = byTier.get(id) ?? []
        const mes = plans.find((p) => monthsOf(p) === 1) ?? plans[0] ?? null
        const activo = tier === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={activo}
            className={cn(
              'rounded-2xl border p-3 text-left transition-all active:scale-95',
              activo
                ? 'border-blue bg-blue/5 ring-1 ring-blue/30'
                : 'border-line bg-card hover:border-blue/40',
            )}
          >
            <Icon
              className={cn('h-4 w-4', activo ? 'text-blue' : 'text-muted-foreground')}
              aria-hidden
            />
            <p className="mt-1.5 font-display text-[13.5px] font-bold leading-tight">
              {label}
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-foreground/80">
              {mes ? `${formatCup(mes.discountedPriceCup ?? mes.priceCup)}/mes` : '—'}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              {mes ? `${mes.toolCredits} cr. de herramientas` : ''}
            </p>
          </button>
        )
      })}
    </div>
  )
}
