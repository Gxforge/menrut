// MENRUT — Inicio · Buscador de rutas (pantalla estrella del cliente)
// Hero con saludo, buscador protagonista origen→destino con selector de
// municipio (Command), accesos rápidos, rutas populares y mejores mensajeros.
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowUpDown, Bell, Bike, Heart, Map, MapPin, RotateCcw, Search,
  Users, Route as RouteIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { TopBar } from '@/components/menrut/core/TopBar'
import { CourierCard } from '@/components/menrut/core/CourierCard'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { EmptyState, ListSkeleton, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { MenrutWordmark } from '@/components/menrut/core/Brand'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { ProvinceDto } from '@/lib/types'

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
      <header className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-navy via-[#0d3375] to-deep px-4 pb-16 pt-safe">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(0,194,255,0.28)_0%,rgba(11,43,96,0)_60%)]"
        />
        <RouteIcon
          aria-hidden
          className="pointer-events-none absolute -bottom-7 -right-6 h-36 w-36 rotate-[-14deg] text-white/[0.07]"
        />
        <div className="relative flex items-center justify-between pt-4">
          <MenrutWordmark tone="light" className="h-9 w-auto" />
          <button
            type="button"
            onClick={handleNotifications}
            aria-label="Notificaciones"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-90"
          >
            <Bell className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="relative mt-7">
          <h1 className="font-display text-[27px] font-extrabold leading-tight tracking-tight text-white">
            ¿A dónde vas?
          </h1>
          <p className="mt-1.5 text-[13.5px] text-white/75">
            Encuentra mensajeros que cubran tu ruta.
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-8 px-4 pb-10">
        {/* ── Buscador protagonista ────────────────────────────────────────── */}
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
                  onClick={() => setMode('zone')}
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
                  onClick={() => setMode('travel')}
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
                value={search.originId}
                provinces={provinces}
                loading={territoriesQuery.isLoading}
                tone="blue"
                onSelect={(id) => setSearch({ originId: id })}
              />
              {mode === 'travel' && (
                <>
                  <TerritoryPicker
                    label="Hacia"
                    placeholder="Municipio de destino"
                    value={search.destinationId}
                    provinces={provinces}
                    loading={territoriesQuery.isLoading}
                    tone="orange"
                    onSelect={(id) => setSearch({ destinationId: id })}
                  />

                  {/* Intercambio origen ↔ destino */}
                  <button
                    type="button"
                    onClick={() => setSearch({ originId: search.destinationId, destinationId: search.originId })}
                    disabled={!search.originId && !search.destinationId}
                    aria-label="Intercambiar origen y destino"
                    className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-secondary text-navy shadow-sm transition-all hover:border-blue/40 active:scale-90 disabled:opacity-40"
                  >
                    <ArrowUpDown className="h-4 w-4" aria-hidden />
                  </button>
                </>
              )}
            </div>

            {territoriesQuery.isError && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-orange/10 px-3 py-2 text-[12px] text-orange">
                <span>No se pudieron cargar los territorios.</span>
                <button
                  type="button"
                  onClick={() => territoriesQuery.refetch()}
                  className="flex items-center gap-1 font-bold hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Reintentar
                </button>
              </div>
            )}

            <Button
              onClick={handleSearch}
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
        <section aria-labelledby="home-popular">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="home-popular" className="section-title">Rutas populares</h2>
          </div>
          {popularQuery.isLoading ? (
            <div className="space-y-3">
              <RouteSkeleton />
              <RouteSkeleton />
              <RouteSkeleton />
            </div>
          ) : popularQuery.isError ? (
            <EmptyState
              icon={<RouteIcon className="h-8 w-8" aria-hidden />}
              title="No pudimos cargar las rutas populares"
              hint="Revisa tu conexión y vuelve a intentarlo."
              actionLabel="Reintentar"
              onAction={() => popularQuery.refetch()}
              className="rounded-2xl border border-dashed border-line bg-card/60 py-8"
            />
          ) : popularQuery.data && popularQuery.data.routes.length > 0 ? (
            <div className="space-y-3">
              {popularQuery.data.routes.slice(0, 5).map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onOpen={() => {
                    if (route.originId && route.destinationId) {
                      openRoute(route.originId, route.destinationId)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              Todavía no hay rutas populares publicadas. Vuelve pronto.
            </p>
          )}
        </section>

        {/* ── Mejor reputación ─────────────────────────────────────────────── */}
        <section aria-labelledby="home-top">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="home-top" className="section-title">Mensajeros con mejor reputación</h2>
          </div>
          {topCouriersQuery.isLoading ? (
            <ListSkeleton count={3} />
          ) : topCouriersQuery.isError ? (
            <EmptyState
              title="No pudimos cargar los mensajeros destacados"
              hint="Revisa tu conexión y vuelve a intentarlo."
              actionLabel="Reintentar"
              onAction={() => topCouriersQuery.refetch()}
              className="rounded-2xl border border-dashed border-line bg-card/60 py-8"
            />
          ) : topCouriersQuery.data && topCouriersQuery.data.results.length > 0 ? (
            <div className="space-y-3">
              {topCouriersQuery.data.results.slice(0, 3).map((courier) => (
                <CourierCard key={courier.courierId} courier={courier} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              Aún no hay mensajeros publicados. Prueba otra búsqueda más tarde.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

// ─── Selector de territorio (Popover + Command buscador) ─────────────────────

function TerritoryPicker({
  label, placeholder, value, provinces, loading, tone, onSelect,
}: {
  label: string
  placeholder: string
  value: string | null
  provinces: ProvinceDto[]
  loading: boolean
  tone: 'blue' | 'orange'
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => provinces.flatMap((p) => p.municipalities.map((m) => ({ id: m.id, name: m.name, province: p.name }))).find((m) => m.id === value),
    [provinces, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading}
          aria-label={`${label}: ${selected ? `${selected.province} · ${selected.name}` : placeholder}`}
          className={cn(
            'flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-line bg-secondary/50 px-3 text-left pr-14 transition-colors hover:border-blue/40 active:scale-[0.99] disabled:opacity-60',
            open && 'border-blue/60 bg-secondary'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              tone === 'blue' ? 'bg-blue' : 'bg-orange'
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            {loading ? (
              <Skeleton className="mt-1 h-4 w-28" />
            ) : selected ? (
              <span className="block truncate text-[13.5px] font-semibold">
                {selected.province} · {selected.name}
              </span>
            ) : (
              <span className="block truncate text-[13.5px] text-muted-foreground">{placeholder}</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] rounded-2xl p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar municipio o provincia…" />
          <CommandList className="nice-scroll max-h-[300px]">
            <CommandEmpty>Sin resultados. Prueba con otro nombre.</CommandEmpty>
            {provinces.map((province) => (
              <CommandGroup key={province.id} heading={province.name}>
                {province.municipalities.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${province.name}`}
                    onSelect={() => {
                      onSelect(m.id)
                      setOpen(false)
                    }}
                    className="text-[13px]"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{province.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Shortcut({
  icon, label, onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-card px-2 py-3 text-center shadow-[0_8px_22px_rgba(20,67,130,0.05)] transition-all hover:border-blue/40 hover:shadow-[0_12px_30px_rgba(20,67,130,0.10)] active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue">
        {icon}
      </span>
      <span className="text-[11.5px] font-semibold leading-tight">{label}</span>
    </button>
  )
}
