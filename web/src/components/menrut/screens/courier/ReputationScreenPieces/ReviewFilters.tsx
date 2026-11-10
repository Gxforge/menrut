// MENRUT — ReputationScreen · Filtros de opiniones (todas / verificadas /
// sin verificar).
'use client'

import { cn } from '@/lib/utils'

export type Filtro = 'todas' | 'verificadas' | 'sin-verificar'

interface ReviewFiltersProps {
  filtro: Filtro
  total: number
  nVerificadas: number
  onChange: (f: Filtro) => void
}

export function ReviewFilters({ filtro, total, nVerificadas, onChange }: ReviewFiltersProps) {
  return (
    <div className="mt-5 flex gap-2" role="group" aria-label="Filtrar opiniones">
      {([
        ['todas', `Todas (${total})`],
        ['verificadas', `Verificadas (${nVerificadas})`],
        ['sin-verificar', `Sin verificar (${total - nVerificadas})`],
      ] as [Filtro, string][]).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={filtro === key}
          className={cn(
            'min-h-[36px] rounded-full border px-3.5 text-[12px] font-semibold transition-all active:scale-95',
            filtro === key
              ? 'border-blue bg-blue text-white'
              : 'border-line bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
