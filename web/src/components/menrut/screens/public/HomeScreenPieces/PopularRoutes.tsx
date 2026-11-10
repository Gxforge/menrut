// MENRUT — HomeScreen · sección de rutas populares.
'use client'

import { Route as RouteIcon } from 'lucide-react'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import type { RouteDto } from '@/lib/types'

export function PopularRoutes({
  isLoading,
  isError,
  routes,
  onRetry,
  onOpenRoute,
}: {
  isLoading: boolean
  isError: boolean
  routes: RouteDto[]
  onRetry: () => void
  onOpenRoute: (originId: string, destinationId: string) => void
}) {
  return (
    <section aria-labelledby="home-popular">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="home-popular" className="section-title">Rutas populares</h2>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <RouteSkeleton />
          <RouteSkeleton />
          <RouteSkeleton />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<RouteIcon className="h-8 w-8" aria-hidden />}
          title="No pudimos cargar las rutas populares"
          hint="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={onRetry}
          className="rounded-2xl border border-dashed border-line bg-card/60 py-8"
        />
      ) : routes.length > 0 ? (
        <div className="space-y-3">
          {routes.slice(0, 5).map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onOpen={() => {
                if (route.originId && route.destinationId) {
                  onOpenRoute(route.originId, route.destinationId)
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
  )
}
