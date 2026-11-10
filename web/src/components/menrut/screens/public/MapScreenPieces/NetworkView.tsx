// MENRUT — MapScreen · vista «Red de rutas» (mapa esquemático + grupos).
'use client'

import { MapEmpty } from '@/components/menrut/core/EmptyState'
import { cn } from '@/lib/utils'
import type { RouteDto } from '@/lib/types'
import type { ProvinceCount } from './data'
import { ProvinceGroup } from './ProvinceGroup'

export function NetworkView({
  listMode,
  zones,
  totalRoutes,
  selectedProvince,
  onSelectProvince,
  routesByProvince,
  couriers,
  onOpenRoute,
  provinceCounts,
}: {
  listMode: boolean
  zones: { label: string; items: ProvinceCount[] }[]
  totalRoutes: number
  selectedProvince: string | null
  onSelectProvince: (name: string | null) => void
  routesByProvince: Map<string, RouteDto[]>
  couriers: Record<string, string>
  onOpenRoute: (r: RouteDto) => void
  provinceCounts: ProvinceCount[]
}) {
  return (
    <>
      {/* Mapa esquemático: provincias como nodos de occidente a oriente */}
      {!listMode && (
        <section aria-label="Mapa esquemático de provincias" className="rounded-3xl border border-line bg-card p-3.5">
          <div className="flex items-center justify-between px-0.5 pb-2.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Red de provincias</span>
            <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-semibold text-blue">
              {totalRoutes} {totalRoutes === 1 ? 'ruta activa' : 'rutas activas'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {zones.map((z) => (
              <div key={z.label} className="min-w-0">
                <p className="pb-1.5 text-center text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  {z.label}
                </p>
                <div className="space-y-1.5">
                  {z.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProvince(selectedProvince === p.name ? null : p.name)}
                      aria-pressed={selectedProvince === p.name}
                      className={cn(
                        'flex w-full flex-col items-center rounded-xl border px-1 py-2 text-center transition-all active:scale-95',
                        p.count > 0 ? 'border-blue/25 bg-blue/5' : 'border-line bg-muted/40',
                        selectedProvince === p.name && 'border-blue bg-blue/10 ring-2 ring-blue/40'
                      )}
                    >
                      <span className={cn('leading-tight text-[11px] font-semibold', p.count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                        {p.name}
                      </span>
                      <span className={cn('mt-0.5 text-[9.5px] font-medium', p.count > 0 ? 'text-blue' : 'text-muted-foreground')}>
                        {p.count > 0 ? `${p.count} ${p.count === 1 ? 'ruta' : 'rutas'}` : 'Sin rutas'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rutas activas (agrupadas por provincia) */}
      {totalRoutes === 0 ? (
        <MapEmpty />
      ) : selectedProvince ? (
        <ProvinceGroup
          province={selectedProvince}
          routes={routesByProvince.get(selectedProvince) ?? []}
          couriers={couriers}
          onOpen={onOpenRoute}
          onClear={() => onSelectProvince(null)}
          allProvinces={provinceCounts}
        />
      ) : (
        <div className="space-y-4">
          {provinceCounts
            .filter((p) => p.count > 0)
            .map((p) => (
              <ProvinceGroup
                key={p.id}
                province={p.name}
                routes={routesByProvince.get(p.name) ?? []}
                couriers={couriers}
                onOpen={onOpenRoute}
                allProvinces={provinceCounts}
              />
            ))}
        </div>
      )}
    </>
  )
}
