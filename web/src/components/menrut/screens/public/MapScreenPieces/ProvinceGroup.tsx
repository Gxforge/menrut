// MENRUT — MapScreen · grupo de rutas por provincia con sugerencia de vecinas.
'use client'

import { NEIGHBORS, type ProvinceCount } from './data'
import { courierName } from './helpers'
import { RouteRow } from './RouteRow'
import type { RouteDto } from '@/lib/types'

/** Grupo de rutas de una provincia, con sugerencia de vecinas si está vacía. */
export function ProvinceGroup({
  province,
  routes,
  couriers,
  onOpen,
  onClear,
  allProvinces,
}: {
  province: string
  routes: RouteDto[]
  couriers: Record<string, string>
  onOpen: (r: RouteDto) => void
  onClear?: () => void
  allProvinces: ProvinceCount[]
}) {
  return (
    <section aria-label={`Rutas en ${province}`}>
      <div className="flex items-center justify-between gap-2 pb-2">
        <h3 className="section-title">
          {province}
          <span className="ml-2 text-[12px] font-medium text-muted-foreground">
            {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'}
          </span>
        </h3>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-navy transition-transform active:scale-95"
          >
            Ver todo el país
          </button>
        )}
      </div>
      {routes.length > 0 ? (
        <div className="space-y-2.5">
          {routes.map((r) => (
            <RouteRow key={r.id} route={r} courier={courierName(r, couriers)} onOpen={() => onOpen(r)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-card px-4 py-5 text-center">
          <p className="text-[13px] font-semibold">Sin rutas publicadas en {province} por ahora</p>
          <NeighborsHint province={province} allProvinces={allProvinces} />
        </div>
      )}
    </section>
  )
}

function NeighborsHint({ province, allProvinces }: { province: string; allProvinces: ProvinceCount[] }) {
  const neighbors = (NEIGHBORS[province] ?? [])
    .map((name) => allProvinces.find((p) => p.name === name))
    .filter((p): p is ProvinceCount => !!p && p.count > 0)
  if (neighbors.length === 0) {
    return (
      <p className="mt-1 text-[12px] text-muted-foreground">
        Cuando un mensajero publique un trayecto por aquí, aparecerá en esta red.
      </p>
    )
  }
  return (
    <p className="mt-1 text-[12px] text-muted-foreground">
      Provincias vecinas con rutas: {neighbors.map((n) => `${n.name} (${n.count})`).join(' · ')}.
    </p>
  )
}
