// MENRUT — MapScreen · vista «Mi zona» (provincia elegida + rutas y vecinas).
'use client'

import { SearchX } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProvinceDto, RouteDto } from '@/lib/types'
import { courierName } from './helpers'
import { RouteRow } from './RouteRow'

export function ZoneView({
  provinces,
  zone,
  onChooseZone,
  routesByProvince,
  zoneRoutes,
  zoneNeighbors,
  couriers,
  onOpenRoute,
}: {
  provinces: ProvinceDto[]
  zone: string
  onChooseZone: (value: string) => void
  routesByProvince: Map<string, RouteDto[]>
  zoneRoutes: RouteDto[]
  zoneNeighbors: { name: string; count: number }[]
  couriers: Record<string, string>
  onOpenRoute: (r: RouteDto) => void
}) {
  return (
    <section aria-label="Mi zona">
      <div className="rounded-3xl border border-line bg-card p-4">
        <h2 className="section-title">Elige tu provincia</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Veremos las rutas publicadas con origen o destino en tu zona.
        </p>
        <Select value={zone} onValueChange={onChooseZone}>
          <SelectTrigger className="mt-3 h-12 w-full rounded-2xl text-[14px]" aria-label="Provincia">
            <SelectValue placeholder="Selecciona una provincia" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.name}
                {routesByProvince.get(p.name)?.length
                  ? ` · ${routesByProvince.get(p.name)?.length} ${routesByProvince.get(p.name)?.length === 1 ? 'ruta' : 'rutas'}`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {zone && (
        <div className="mt-4 space-y-2.5">
          <h3 className="section-title">
            Rutas en {zone}
            <span className="ml-2 text-[12px] font-medium text-muted-foreground">
              {zoneRoutes.length} {zoneRoutes.length === 1 ? 'publicada' : 'publicadas'}
            </span>
          </h3>
          {zoneRoutes.length > 0 ? (
            zoneRoutes.map((r) => (
              <RouteRow key={r.id} route={r} courier={courierName(r, couriers)} onOpen={() => onOpenRoute(r)} />
            ))
          ) : (
            <div className="rounded-2xl border border-line bg-card px-4 py-6 text-center">
              <SearchX className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-[13.5px] font-semibold">Sin rutas publicadas en {zone} por ahora</p>
              {zoneNeighbors.length > 0 ? (
                <>
                  <p className="mt-1 text-[12px] text-muted-foreground">Prueba con una provincia vecina:</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {zoneNeighbors.map((n) => (
                      <button
                        key={n.name}
                        type="button"
                        onClick={() => onChooseZone(n.name)}
                        className="rounded-full border border-blue/30 bg-blue/5 px-3 py-1.5 text-[11.5px] font-semibold text-blue transition-transform active:scale-95"
                      >
                        {n.name} · {n.count}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Todavía no hay rutas cerca. Guarda el trayecto para recibir avisos de nuevas ofertas.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
