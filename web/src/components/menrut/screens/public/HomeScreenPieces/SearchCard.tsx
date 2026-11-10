// MENRUT — HomeScreen · buscador protagonista origen→destino.
'use client'

import { ArrowUpDown, MapPin, RotateCcw, Route as RouteIcon, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProvinceDto } from '@/lib/types'
import { TerritoryPicker } from './TerritoryPicker'

export function SearchCard({
  mode,
  onSetMode,
  originId,
  destinationId,
  provinces,
  territoriesLoading,
  territoriesError,
  onRetryTerritories,
  onOriginChange,
  onDestinationChange,
  onSwap,
  ready,
  onSearch,
}: {
  mode: 'zone' | 'travel'
  onSetMode: (m: 'zone' | 'travel') => void
  originId: string | null
  destinationId: string | null
  provinces: ProvinceDto[]
  territoriesLoading: boolean
  territoriesError: boolean
  onRetryTerritories: () => void
  onOriginChange: (id: string) => void
  onDestinationChange: (id: string) => void
  onSwap: () => void
  ready: boolean
  onSearch: () => void
}) {
  return (
    <section aria-label="Buscar mensajeros por ruta" className="-mt-10">
      <div className="rounded-3xl border border-line bg-card p-4 shadow-[0_18px_50px_rgba(20,67,130,0.13)]">
        {/* ¿Qué tipo de mensajero buscas? (decisión del propietario: el
            cliente elige directamente entre mensajeros de zona y los que
            viajan a otros municipios/provincias) */}
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            ¿Qué tipo de mensajero buscas?
          </p>
          <div role="radiogroup" aria-label="Tipo de mensajero" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'zone'}
              onClick={() => onSetMode('zone')}
              className={cn(
                'flex h-11 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
                mode === 'zone' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MapPin className="h-4 w-4" aria-hidden />
              De mi zona
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'travel'}
              onClick={() => onSetMode('travel')}
              className={cn(
                'flex h-11 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
                mode === 'travel' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <RouteIcon className="h-4 w-4" aria-hidden />
              Viaja a otros lugares
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {mode === 'zone'
              ? 'Mensajeros que trabajan dentro de tu municipio, con entregas el mismo día.'
              : 'Mensajeros que cubren rutas entre municipios o provincias.'}
          </p>
        </div>

        <div className="relative space-y-1">
          <TerritoryPicker
            label={mode === 'zone' ? 'Tu municipio' : 'Desde'}
            placeholder={mode === 'zone' ? 'Municipio donde estás' : 'Municipio de origen'}
            value={originId}
            provinces={provinces}
            loading={territoriesLoading}
            tone="blue"
            onSelect={onOriginChange}
          />
          {mode === 'travel' && (
            <>
              <TerritoryPicker
                label="Hacia"
                placeholder="Municipio de destino"
                value={destinationId}
                provinces={provinces}
                loading={territoriesLoading}
                tone="orange"
                onSelect={onDestinationChange}
              />

              {/* Intercambio origen ↔ destino */}
              <button
                type="button"
                onClick={onSwap}
                disabled={!originId && !destinationId}
                aria-label="Intercambiar origen y destino"
                className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-secondary text-navy shadow-sm transition-all hover:border-blue/40 active:scale-90 disabled:opacity-40"
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
        </div>

        {territoriesError && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-orange/10 px-3 py-2 text-[12px] text-orange">
            <span>No se pudieron cargar los territorios.</span>
            <button
              type="button"
              onClick={onRetryTerritories}
              className="flex items-center gap-1 font-bold hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reintentar
            </button>
          </div>
        )}

        <Button
          onClick={onSearch}
          disabled={!ready}
          className="mt-4 h-12 w-full rounded-full text-[15px] font-bold"
        >
          <Search className="mr-1 h-4 w-4" aria-hidden />
          {mode === 'zone' ? 'Buscar mensajeros de zona' : 'Buscar mensajeros'}
        </Button>
        {!ready && (
          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            {mode === 'zone' ? 'Elige tu municipio para ver mensajeros de zona.' : 'Elige origen y destino para buscar.'}
          </p>
        )}
      </div>
    </section>
  )
}
