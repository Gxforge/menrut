// MENRUT — PlanOptionsScreen · Prueba gratuita (una sola vez por cuenta).
'use client'

import { Loader2, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanDto } from '@/lib/types'

interface TrialBannerProps {
  trial: PlanDto
  isPending: boolean
  onActivate: (plan: PlanDto) => void
}

export function TrialBanner({ trial, isPending, onActivate }: TrialBannerProps) {
  return (
    <section
      aria-label="Prueba gratuita"
      className="mb-4 rounded-2xl border border-line bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Ticket className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14.5px] font-bold leading-tight">
            Prueba gratuita
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {trial.description}
          </p>
          <Button
            size="sm"
            className="mt-2.5 h-10 rounded-full px-5"
            disabled={isPending}
            onClick={() => onActivate(trial)}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Activando…
              </>
            ) : (
              'Activar prueba gratuita'
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
