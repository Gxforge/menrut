// MENRUT — Resultados de mensajeros
// Lista de pasaportes resumidos (CourierCard) consultando /api/search con
// los filtros del store; orden, filtros y alternativas cercanas.
'use client'

import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ArrowRight, MapPin, SlidersHorizontal } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TopBar } from '@/components/menrut/core/TopBar'
import { CourierCard } from '@/components/menrut/core/CourierCard'
import { EmptyState, ListSkeleton, NoResultsEmpty } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { ProvinceDto, SearchFilters } from '@/lib/types'

const SORT_LABELS: Record<SearchFilters['sort'], string> = {
  relevance: 'Relevancia',
  rating: 'Mejor valoración',
  availability: 'Disponibilidad',
}

export default function ResultsScreen() {
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const history = useAppStore((s) => s.history)

  // Parámetros de búsqueda derivados del store (contrato /api/search).
  // Comprobaciones truthy defensivas: el estado persistido puede estar
  // incompleto (versiones antiguas) y nunca debemos enviar "undefined".
  const paramsKey = useMemo(() => {
    const p = new URLSearchParams()
    if (search.originId) p.set('origin', search.originId)
    if (search.destinationId) p.set('destination', search.destinationId)
    if (search.routeMode && search.routeMode !== 'any') p.set('routeMode', search.routeMode)
    if (search.serviceType && search.serviceType !== 'any') p.set('serviceType', search.serviceType)
    if (search.vehicle && search.vehicle !== 'any') p.set('vehicle', search.vehicle)
    if (typeof search.minRating === 'number') p.set('minRating', String(search.minRating))
    if (typeof search.maxFee === 'number') p.set('maxFee', String(search.maxFee))
    if (search.onlyVerified) p.set('onlyVerified', 'true')
    // T8-c: filtro por tipo de mensajero (zone | municipal | provincial).
    // El estado persistido de versiones anteriores puede no traerlo.
    const coverageType = search.coverageType ?? 'any'
    if (coverageType !== 'any') p.set('coverageType', coverageType)
    if (search.sort) p.set('sort', search.sort)
    return p.toString()
  }, [search])

  const resultsQuery = useQuery({
    queryKey: ['search', paramsKey],
    queryFn: () => api.search(new URLSearchParams(paramsKey)),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    retry: 1,
  })

  // Nombres de territorio desde la caché compartida
  const territoriesQuery = useQuery({
    queryKey: ['territories'],
    queryFn: () => api.territories(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
  const provinces = useMemo<ProvinceDto[]>(
    () => territoriesQuery.data?.provinces ?? [],
    [territoriesQuery.data]
  )

  const originName = useMemo(
    () => municipalityName(provinces, search.originId),
    [provinces, search.originId]
  )
  const destinationName = useMemo(
    () => municipalityName(provinces, search.destinationId),
    [provinces, search.destinationId]
  )

  const routeLabel =
    search.coverageType === 'zone' && originName
      ? `Mensajeros de zona · ${originName}`
      : originName && destinationName
        ? `${originName} → ${destinationName}`
        : originName
          ? `Desde ${originName}`
          : destinationName
            ? `Hacia ${destinationName}`
            : 'Todos los mensajeros'

  const results = resultsQuery.data?.results ?? []
  const alternatives = resultsQuery.data?.alternatives ?? []

  function handleBack() {
    if (history.length > 0) back()
    else navigate('home')
  }

  function tryAlternative(name: string) {
    const id = municipalityIdByName(provinces, name)
    if (!id) return
    // Municipio cercano al origen: probamos con él como nueva salida.
    setSearch({ originId: id })
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Resultados"
        subtitle={routeLabel}
        onBack={handleBack}
        right={
          <button
            type="button"
            onClick={() => navigate('filters')}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-[12px] font-semibold text-navy transition-all hover:bg-secondary/70 active:scale-95"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filtros
          </button>
        }
      />

      <div className="flex-1 space-y-3 px-4 pb-8 pt-3">
        {/* Resumen + orden */}
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground" aria-live="polite">
            {resultsQuery.isPending
              ? 'Buscando mensajeros…'
              : results.length === 1
                ? '1 mensajero encontrado'
                : `${results.length} mensajeros encontrados`}
          </p>
          <Select
            value={search.sort}
            onValueChange={(v) => setSearch({ sort: v as SearchFilters['sort'] })}
          >
            <SelectTrigger
              className="h-10 w-[178px] shrink-0 rounded-full bg-card text-[12.5px] font-semibold"
              aria-label="Ordenar resultados"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {(Object.keys(SORT_LABELS) as SearchFilters['sort'][]).map((k) => (
                <SelectItem key={k} value={k} className="text-[13px]">
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contenido */}
        {resultsQuery.isPending ? (
          <ListSkeleton count={4} />
        ) : resultsQuery.isError ? (
          <EmptyState
            icon={<MapPin className="h-8 w-8" aria-hidden />}
            title="No pudimos cargar los resultados"
            hint="Revisa tu conexión. Tus filtros siguen guardados."
            actionLabel="Reintentar"
            onAction={() => resultsQuery.refetch()}
            className="rounded-2xl border border-dashed border-line bg-card/60"
          />
        ) : results.length === 0 ? (
          <div className="space-y-4">
            <NoResultsEmpty onAction={() => navigate('filters')} />
            {alternatives.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="text-[13px] font-semibold">Prueba con un municipio cercano</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {alternatives.slice(0, 6).map((alt) => {
                    const id = municipalityIdByName(provinces, alt)
                    return (
                      <button
                        key={alt}
                        type="button"
                        disabled={!id}
                        onClick={() => tryAlternative(alt)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-blue/30 bg-blue/5 px-3.5 text-[12.5px] font-semibold text-blue transition-all hover:bg-blue/10 active:scale-95 disabled:opacity-40"
                      >
                        Probar {alt}
                        {destinationName && (
                          <>
                            <ArrowRight className="h-3 w-3" aria-hidden />
                            {destinationName}
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={`space-y-3 transition-opacity ${resultsQuery.isFetching ? 'opacity-60' : ''}`}>
              {results.map((courier) => (
                <CourierCard key={courier.courierId} courier={courier} />
              ))}
            </div>
            <p className="px-2 pt-1 text-center text-[11.5px] leading-relaxed text-muted-foreground">
              Las tarifas son orientativas y se confirman directamente con el mensajero.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers de territorio ───────────────────────────────────────────────────

function municipalityName(provinces: ProvinceDto[], id: string | null): string | null {
  if (!id) return null
  for (const p of provinces) {
    const m = p.municipalities.find((mm) => mm.id === id)
    if (m) return m.name
  }
  return null
}

function municipalityIdByName(provinces: ProvinceDto[], name: string): string | null {
  const lower = name.trim().toLowerCase()
  for (const p of provinces) {
    const m = p.municipalities.find((mm) => mm.name.toLowerCase() === lower)
    if (m) return m.id
  }
  return null
}
