// MENRUT — Inicio · Buscador de rutas (pantalla estrella del cliente)
// Hero con saludo, buscador protagonista origen→destino con selector de
// municipio (Command), accesos rápidos, rutas populares y mejores mensajeros.
// Las secciones visuales viven en ./HomeScreenPieces/; AppRouter sigue
// importando este archivo.
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bike, Heart, Map, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { ProvinceDto } from '@/lib/types'
import { HomeHero } from './HomeScreenPieces/HomeHero'
import { SearchCard } from './HomeScreenPieces/SearchCard'
import { Shortcut } from './HomeScreenPieces/Shortcut'
import { PopularRoutes } from './HomeScreenPieces/PopularRoutes'
import { TopCouriers } from './HomeScreenPieces/TopCouriers'

export default function HomeScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const setSearch = useAppStore((s) => s.setSearch)
  const search = useAppStore((s) => s.search)

  // ¿Qué busca el cliente? mensajeros de zona (trabajan dentro de su
  // municipio) o mensajeros que viajan a otros municipios/provincias.
  const mode: 'zone' | 'travel' = search.coverageType === 'zone' ? 'zone' : 'travel'
  const setMode = (m: 'zone' | 'travel') => setSearch({ coverageType: m === 'zone' ? 'zone' : 'any' })
  const territoriesQuery = useQuery({
    queryKey: ['territories'],
    queryFn: () => api.territories(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
  const provinces = useMemo<ProvinceDto[]>(() => territoriesQuery.data?.provinces ?? [], [territoriesQuery.data])

  // Rutas populares
  const popularQuery = useQuery({
    queryKey: ['popular-routes'],
    queryFn: () => api.popularRoutes(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Mensajeros con mejor reputación (búsqueda sin filtros = top)
  const topCouriersQuery = useQuery({
    queryKey: ['search', 'top'],
    queryFn: () => api.search(new URLSearchParams()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const ready = mode === 'zone' ? !!search.originId : !!search.originId && !!search.destinationId

  function handleSearch() {
    if (!ready) return
    if (mode === 'zone') {
      // Mensajeros de zona: búsqueda local por el municipio del cliente.
      setSearch({ destinationId: null })
    }
    navigate('results')
  }

  function handleNearby() {
    if (!search.originId) {
      toast.info('Elige tu origen en el buscador para ver mensajeros cercanos.')
      return
    }
    setSearch({ destinationId: null })
    navigate('results')
  }

  function handleMap() {
    navigate('map')
  }

  function handleSaved() {
    if (!session) {
      toast.info('Inicia sesión para ver tus rutas guardadas.')
      navigate('login')
      return
    }
    navigate('saved')
  }

  function handleNotifications() {
    if (!session) {
      toast.info('Inicia sesión para ver tus notificaciones.')
      navigate('login')
      return
    }
    navigate('notifications')
  }

  function openRoute(originId: string, destinationId: string) {
    setSearch({ originId, destinationId })
    navigate('results')
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* ── Hero: marca + saludo ─────────────────────────────────────────── */}
      <HomeHero onNotifications={handleNotifications} />

      <main className="flex-1 space-y-8 px-4 pb-10">
        {/* ── Buscador protagonista ────────────────────────────────────────── */}
        <SearchCard
          mode={mode}
          onSetMode={setMode}
          originId={search.originId}
          destinationId={search.destinationId}
          provinces={provinces}
          territoriesLoading={territoriesQuery.isLoading}
          territoriesError={territoriesQuery.isError}
          onRetryTerritories={() => territoriesQuery.refetch()}
          onOriginChange={(id) => setSearch({ originId: id })}
          onDestinationChange={(id) => setSearch({ destinationId: id })}
          onSwap={() => setSearch({ originId: search.destinationId, destinationId: search.originId })}
          ready={ready}
          onSearch={handleSearch}
        />

        {/* ── Accesos rápidos ────────────────────────────────────────────── */}
        <section aria-label="Accesos rápidos">
          <div className="grid grid-cols-3 gap-3">
            <Shortcut
              icon={<Users className="h-5 w-5" aria-hidden />}
              label="Mensajeros cercanos"
              onClick={handleNearby}
            />
            <Shortcut
              icon={<Map className="h-5 w-5" aria-hidden />}
              label="Mapa de rutas"
              onClick={handleMap}
            />
            <Shortcut
              icon={<Heart className="h-5 w-5" aria-hidden />}
              label="Rutas guardadas"
              onClick={handleSaved}
            />
          </div>
        </section>

        {/* ── ¿Haces mensajería? (registro de mensajero) ─────────────────── */}
        {!session ? (
          <section
            aria-label="Publica tu ruta como mensajero"
            className="rounded-2xl border border-dashed border-blue/40 bg-blue/[0.04] p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <Bike className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight">¿Haces mensajería?</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Publica tus rutas y tu pasaporte profesional para que te encuentren.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0 rounded-full px-4 font-bold"
                onClick={() => navigate('register')}
              >
                Publicar
              </Button>
            </div>
          </section>
        ) : null}

        {/* ── Rutas populares ──────────────────────────────────────────────── */}
        <PopularRoutes
          isLoading={popularQuery.isLoading}
          isError={popularQuery.isError}
          routes={popularQuery.data?.routes ?? []}
          onRetry={() => popularQuery.refetch()}
          onOpenRoute={openRoute}
        />

        {/* ── Mejor reputación ─────────────────────────────────────────────── */}
        <TopCouriers
          isLoading={topCouriersQuery.isLoading}
          isError={topCouriersQuery.isError}
          couriers={topCouriersQuery.data?.results ?? []}
          onRetry={() => topCouriersQuery.refetch()}
        />
      </main>
    </div>
  )
}
