// MENRUT — CompleteProfileScreen · sección «¿Cómo trabajas?» (se pregunta PRIMERO).
'use client'

import { Check, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageType } from '@/lib/types'
import { TIPO_OPCIONES } from './data'
import { TipoInfoCard } from './TipoInfoCard'

export function TipoSelector({
  tipo,
  onSelect,
  error,
  zonaBase,
  cobertura,
}: {
  tipo: CoverageType | null
  onSelect: (tipo: CoverageType) => void
  error?: string
  zonaBase: string | null
  cobertura: string[]
}) {
  return (
    <section aria-labelledby="cp-tipo" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="cp-tipo" className="section-title flex items-center gap-2">
          <Compass className="h-4 w-4 text-blue" aria-hidden />
          ¿Cómo trabajas?
        </h2>
        <span className="text-[11px] font-semibold text-muted-foreground">Obligatorio</span>
      </div>

      <div role="radiogroup" aria-labelledby="cp-tipo" className="space-y-2.5">
        {TIPO_OPCIONES.map((opt) => {
          const Icon = opt.icon
          const active = tipo === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99]',
                active
                  ? 'border-blue bg-blue/5 ring-1 ring-blue/30'
                  : 'border-line bg-card hover:border-blue/40'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  active ? 'bg-blue text-white' : 'bg-blue/10 text-blue'
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-tight text-foreground">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
                  {opt.desc}
                </span>
                <span className="mt-1 block text-[11.5px] font-medium leading-snug text-blue">
                  {opt.ejemplo}
                </span>
              </span>
              {active && <Check className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden />}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">{error}</p>
      )}

      {/* La ficha se adapta al tipo elegido */}
      {tipo && <TipoInfoCard tipo={tipo} zonaBase={zonaBase} cobertura={cobertura} />}
    </section>
  )
}
