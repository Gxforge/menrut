// MENRUT — Mapa de rutas (sección dedicada, no fondo permanente)
// Modo bajo consumo: NO se usan mapas pesados (Leaflet/Google). El «mapa» es una
// vista esquemática propia en CSS/SVG: la red de las 16 provincias como nodos
// organizados de occidente a oriente, con alternativa de «Modo lista».
// Sin geolocalización en vivo: las rutas mostradas son publicadas por mensajeros.
//
// Piezas de esta pantalla en ./MapScreenPieces/ (datos territoriales, vistas
// de red/zona, tarjetas y panel de detalle); AppRouter sigue importando aquí.
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info, ListTree, MapPin, Network, RefreshCw } from 'lucide-react'
import { RouteSkeleton, EmptyState } from '@/components/menrut/core/EmptyState'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { RouteDto } from '@/lib/types'
import { LS_LIST_MODE, LS_ZONE, NEIGHBORS, PROVINCE_REGION, REGION_ORDER, readLS, writeLS, type ProvinceCount, type RegionLabel } from './MapScreenPieces/data'
import { SegmentButton } from './MapScreenPieces/SegmentButton'
import { NetworkView } from './MapScreenPieces/NetworkView'
import { ZoneView } from './MapScreenPieces/ZoneView'
import { RouteDrawer } from './MapScreenPieces/RouteDrawer'

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
          <NetworkView
            listMode={listMode}
            zones={zones}
            totalRoutes={totalRoutes}
            selectedProvince={selectedProvince}
            onSelectProvince={setSelectedProvince}
            routesByProvince={routesByProvince}
            couriers={popular.data?.couriers ?? {}}
            onOpenRoute={setOpenRoute}
            provinceCounts={provinceCounts}
          />
        ) : (
          // ── Mi zona ──
          <ZoneView
            provinces={provinces}
            zone={zone}
            onChooseZone={chooseZone}
            routesByProvince={routesByProvince}
            zoneRoutes={zoneRoutes}
            zoneNeighbors={zoneNeighbors}
            couriers={popular.data?.couriers ?? {}}
            onOpenRoute={setOpenRoute}
          />
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
