// MENRUT — Mapa de rutas (sección dedicada, no fondo permanente)
// Modo bajo consumo: NO se usan mapas pesados (Leaflet/Google). El «mapa» es una
// vista esquemática propia en CSS/SVG: la red de las 16 provincias como nodos
// organizados de occidente a oriente, con alternativa de «Modo lista».
// Sin geolocalización en vivo: las rutas mostradas son publicadas por mensajeros.
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, ChevronRight, Info, ListTree, MapPin,
  Network, RefreshCw, Route as RouteIcon, Search, SearchX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapEmpty, RouteSkeleton, EmptyState } from '@/components/menrut/core/EmptyState'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatCup, formatDateTime, FREQ_LABELS, SERVICE_LABELS, VEHICLE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProvinceDto, RouteDto } from '@/lib/types'

// ─── Organización territorial (occidente → centro → oriente) ────────────────
// Solo agrupa la vista; no son datos de producto.

const REGION_ORDER = ['Occidente', 'Centro', 'Oriente'] as const
type RegionLabel = (typeof REGION_ORDER)[number]

const PROVINCE_REGION: Record<string, RegionLabel> = {
  'Pinar del Río': 'Occidente', 'Artemisa': 'Occidente', 'La Habana': 'Occidente',
  'Mayabeque': 'Occidente', 'Matanzas': 'Occidente', 'Isla de la Juventud': 'Occidente',
  'Villa Clara': 'Centro', 'Cienfuegos': 'Centro', 'Sancti Spíritus': 'Centro',
  'Ciego de Ávila': 'Centro', 'Camagüey': 'Centro',
  'Las Tunas': 'Oriente', 'Holguín': 'Oriente', 'Granma': 'Oriente',
  'Santiago de Cuba': 'Oriente', 'Guantánamo': 'Oriente',
}

// Vecindades geográficas reales: se usan para sugerir alternativas cuando una
// provincia no tiene rutas publicadas.
const NEIGHBORS: Record<string, string[]> = {
  'Pinar del Río': ['Artemisa'],
  'Artemisa': ['Pinar del Río', 'La Habana'],
  'La Habana': ['Artemisa', 'Mayabeque'],
  'Mayabeque': ['La Habana', 'Matanzas'],
  'Matanzas': ['Mayabeque', 'Villa Clara', 'Isla de la Juventud'],
  'Isla de la Juventud': ['La Habana', 'Matanzas'],
  'Villa Clara': ['Matanzas', 'Cienfuegos', 'Sancti Spíritus'],
  'Cienfuegos': ['Villa Clara', 'Sancti Spíritus'],
  'Sancti Spíritus': ['Villa Clara', 'Cienfuegos', 'Ciego de Ávila'],
  'Ciego de Ávila': ['Sancti Spíritus', 'Camagüey'],
  'Camagüey': ['Ciego de Ávila', 'Las Tunas'],
  'Las Tunas': ['Camagüey', 'Holguín'],
  'Holguín': ['Las Tunas', 'Granma', 'Santiago de Cuba'],
  'Granma': ['Holguín', 'Las Tunas', 'Santiago de Cuba'],
  'Santiago de Cuba': ['Holguín', 'Granma', 'Guantánamo'],
  'Guantánamo': ['Santiago de Cuba', 'Holguín'],
}

const LS_LIST_MODE = 'menrut-map-list-mode'
const LS_ZONE = 'menrut-map-zone'

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento disponible: la preferencia vive solo en memoria.
  }
}

// ─── Tipos locales ──────────────────────────────────────────────────────────

interface ProvinceCount {
  id: string
  name: string
  region: RegionLabel | 'Otras'
  count: number
}

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [mode, setMode] = useState<'network' | 'zone'>('network')
  const [listMode, setListMode] = useState<boolean>(() => readLS(LS_LIST_MODE) === '1')
  const [zone, setZone] = useState<string>(() => readLS(LS_ZONE) ?? '')
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [openRoute, setOpenRoute] = useState<RouteDto | null>(null)

  const setSearch = useAppStore((s) => s.setSearch)
  const navigate = useAppStore((s) => s.navigate)

  // Catálogo territorial (caché de TanStack; estable) y rutas populares activas
  const territories = useQuery({
    queryKey: ['territories'],
    queryFn: () => api.territories(),
    staleTime: 24 * 60 * 60 * 1000,
  })
  const popular = useQuery({
    queryKey: ['popular-routes'],
    queryFn: () => api.popularRoutes(),
  })

  const provinces = territories.data?.provinces ?? []

  // municipioId → nombre de provincia
  const munToProvince = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of provinces) {
      for (const m of p.municipalities) map.set(m.id, p.name)
    }
    return map
  }, [provinces])

  // Rutas activas agrupadas por provincia (una ruta cuenta en su origen y destino)
  const routesByProvince = useMemo(() => {
    const map = new Map<string, RouteDto[]>()
    for (const r of popular.data?.routes ?? []) {
      const po = r.originId ? munToProvince.get(r.originId) : undefined
      const pd = r.destinationId ? munToProvince.get(r.destinationId) : undefined
      for (const province of new Set([po, pd].filter((x): x is string => !!x))) {
        map.set(province, [...(map.get(province) ?? []), r])
      }
    }
    return map
  }, [popular.data, munToProvince])

  // Provincias con conteo, ordenadas por región (occidente→oriente) y nombre
  const provinceCounts = useMemo<ProvinceCount[]>(() => {
    return provinces
      .map((p) => ({
        id: p.id,
        name: p.name,
        region: PROVINCE_REGION[p.name] ?? ('Otras' as const),
        count: routesByProvince.get(p.name)?.length ?? 0,
      }))
      .sort((a, b) => {
        const ra = REGION_ORDER.indexOf(a.region as RegionLabel)
        const rb = REGION_ORDER.indexOf(b.region as RegionLabel)
        const oa = ra === -1 ? REGION_ORDER.length : ra
        const ob = rb === -1 ? REGION_ORDER.length : rb
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name, 'es')
      })
  }, [provinces, routesByProvince])

  const zones = useMemo(() => {
    const groups = new Map<string, ProvinceCount[]>()
    for (const p of provinceCounts) {
      groups.set(p.region, [...(groups.get(p.region) ?? []), p])
    }
    return [...REGION_ORDER, 'Otras']
      .filter((r) => groups.get(r)?.length)
      .map((r) => ({ label: r, items: groups.get(r) ?? [] }))
  }, [provinceCounts])

  const totalRoutes = popular.data?.routes.length ?? 0
  const loading = popular.isLoading
  const errored = popular.isError

  const zoneRoutes = useMemo(() => {
    if (!zone) return []
    return routesByProvince.get(zone) ?? []
  }, [zone, routesByProvince])

  const zoneNeighbors = useMemo(() => {
    if (!zone) return []
    return (NEIGHBORS[zone] ?? [])
      .map((name) => ({ name, count: routesByProvince.get(name)?.length ?? 0 }))
      .filter((n) => n.count > 0)
  }, [zone, routesByProvince])

  function toggleListMode() {
    setListMode((v) => {
      writeLS(LS_LIST_MODE, v ? '0' : '1')
      return !v
    })
  }

  function chooseZone(value: string) {
    setZone(value)
    writeLS(LS_ZONE, value)
  }

  function searchCouriers(route: RouteDto) {
    setOpenRoute(null)
    setSearch({ originId: route.originId, destinationId: route.destinationId })
    navigate('results')
  }

  return (
    <div className="pb-10">
      <TabHeader title="Rutas" subtitle="Explora trayectos publicados en la red" />

      <div className="space-y-3 px-4 pt-4">
        {/* Toggle segmentado: Red de rutas / Mi zona */}
        <div role="tablist" aria-label="Vista del mapa" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <SegmentButton active={mode === 'network'} onClick={() => setMode('network')} icon={<Network className="h-4 w-4" aria-hidden />}>
            Red de rutas
          </SegmentButton>
          <SegmentButton active={mode === 'zone'} onClick={() => setMode('zone')} icon={<MapPin className="h-4 w-4" aria-hidden />}>
            Mi zona
          </SegmentButton>
        </div>

        {/* Nota de bajo consumo + modo lista (ahorra datos) */}
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Ubicación en vivo no disponible. Las rutas mostradas son publicadas por los mensajeros.
          </p>
          <button
            type="button"
            onClick={toggleListMode}
            aria-pressed={listMode}
            title="Vista de lista (ahorra datos)"
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-all active:scale-95',
              listMode
                ? 'border-blue bg-blue text-white'
                : 'border-line bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            <ListTree className="h-3.5 w-3.5" aria-hidden />
            Modo lista
          </button>
        </div>

        {/* ── Contenido según modo ── */}
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando rutas">
            <RouteSkeleton />
            <RouteSkeleton />
            <RouteSkeleton />
          </div>
        ) : errored ? (
          <EmptyState
            icon={<RefreshCw className="h-8 w-8" aria-hidden />}
            title="No pudimos cargar la red de rutas"
            hint="Revisa tu conexión e inténtalo de nuevo. El modo lista consume menos datos."
            actionLabel="Reintentar"
            onAction={() => popular.refetch()}
          />
        ) : mode === 'network' ? (
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
                            onClick={() => setSelectedProvince(selectedProvince === p.name ? null : p.name)}
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
                couriers={popular.data?.couriers ?? {}}
                onOpen={setOpenRoute}
                onClear={() => setSelectedProvince(null)}
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
                      couriers={popular.data?.couriers ?? {}}
                      onOpen={setOpenRoute}
                      allProvinces={provinceCounts}
                    />
                  ))}
              </div>
            )}
          </>
        ) : (
          // ── Mi zona ──
          <section aria-label="Mi zona">
            <div className="rounded-3xl border border-line bg-card p-4">
              <h2 className="section-title">Elige tu provincia</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Veremos las rutas publicadas con origen o destino en tu zona.
              </p>
              <Select value={zone} onValueChange={chooseZone}>
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
                    <RouteRow key={r.id} route={r} courier={courierName(r, popular.data?.couriers ?? {})} onOpen={() => setOpenRoute(r)} />
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
                              onClick={() => chooseZone(n.name)}
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
        )}
      </div>

      {/* Panel inferior con el detalle de la ruta */}
      <RouteDrawer
        route={openRoute}
        couriers={popular.data?.couriers ?? {}}
        onSearch={searchCouriers}
        onClose={() => setOpenRoute(null)}
      />
    </div>
  )
}

// ─── Piezas locales ─────────────────────────────────────────────────────────

function SegmentButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
        active ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function courierName(route: RouteDto, couriers: Record<string, string>): string | null {
  return route.courierName ?? (route.courierId ? couriers[route.courierId] ?? null : null)
}

/** Tarjeta compacta de ruta (origen → destino) que abre el panel inferior. */
function RouteRow({ route, courier, onOpen }: { route: RouteDto; courier: string | null; onOpen: () => void }) {
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

/** Grupo de rutas de una provincia, con sugerencia de vecinas si está vacía. */
function ProvinceGroup({
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

/** Panel inferior (BottomSheet) con los datos de la ruta y CTA de búsqueda. */
function RouteDrawer({
  route,
  couriers,
  onSearch,
  onClose,
}: {
  route: RouteDto | null
  couriers: Record<string, string>
  onSearch: (r: RouteDto) => void
  onClose: () => void
}) {
  const courier = route ? courierName(route, couriers) : null
  return (
    <Drawer open={!!route} onOpenChange={(open) => !open && onClose()} shouldScaleBackground>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-3xl border-t border-line pb-safe">
        {route && (
          <>
            <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-muted" aria-hidden />
            <DrawerHeader className="px-5 text-left">
              <DrawerTitle className="font-display text-[18px] font-bold leading-tight">
                {route.origin} <ArrowRight className="inline h-4 w-4 text-blue" aria-hidden /> {route.destination}
              </DrawerTitle>
              <DrawerDescription>
                {courier ? `Publicado por ${courier}. ` : ''}
                Datos publicados por el mensajero.
              </DrawerDescription>
            </DrawerHeader>

            <div className="grid grid-cols-2 gap-2.5 px-5">
              <Detail label="Frecuencia">
                {FREQ_LABELS[route.frequency] ?? route.frequency}
                {route.daysNote ? ` · ${route.daysNote}` : ''}
              </Detail>
              <Detail label="Servicio">{SERVICE_LABELS[route.serviceType] ?? route.serviceType}</Detail>
              <Detail label="Vehículo">{VEHICLE_LABELS[route.vehicleType] ?? route.vehicleType}</Detail>
              <Detail label="Tarifa orientativa">
                {route.feeCup !== null && route.feeCup !== undefined ? formatCup(route.feeCup) : 'Por acordar'}
              </Detail>
              {route.nextDepartureAt && (
                <Detail label="Próximo recorrido">{formatDateTime(route.nextDepartureAt)}</Detail>
              )}
              {route.stops && <Detail label="Paradas">{route.stops}</Detail>}
            </div>

            {route.notes && (
              <p className="mx-5 mt-3 rounded-xl bg-secondary/70 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                {route.notes}
              </p>
            )}

            <DrawerFooter className="px-5 pb-5">
              <Button
                className="h-12 rounded-full text-[14.5px] font-bold"
                onClick={() => onSearch(route)}
              >
                <Search className="h-4 w-4" aria-hidden />
                Buscar mensajeros
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-medium leading-snug">{children}</p>
    </div>
  )
}
