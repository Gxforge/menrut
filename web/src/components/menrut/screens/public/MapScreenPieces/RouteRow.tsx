// MENRUT — MapScreen · tarjeta compacta de ruta (origen → destino).
'use client'

import { ArrowRight, ChevronRight, Route as RouteIcon } from 'lucide-react'
import { FREQ_LABELS } from '@/lib/format'
import type { RouteDto } from '@/lib/types'

/** Tarjeta compacta de ruta (origen → destino) que abre el panel inferior. */
export function RouteRow({ route, courier, onOpen }: { route: RouteDto; courier: string | null; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-line bg-card p-3.5 text-left transition-all hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
          <RouteIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold leading-tight">
            {route.origin} <ArrowRight className="inline h-3.5 w-3.5 text-blue" aria-hidden /> {route.destination}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {courier ? `${courier} · ` : ''}
            {FREQ_LABELS[route.frequency] ?? route.frequency}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
    </button>
  )
}
