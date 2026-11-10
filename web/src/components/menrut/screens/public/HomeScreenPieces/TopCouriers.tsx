// MENRUT — HomeScreen · sección de mensajeros con mejor reputación.
'use client'

import { CourierCard } from '@/components/menrut/core/CourierCard'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import type { CourierSearchItem } from '@/lib/types'

export function TopCouriers({
  isLoading,
  isError,
  couriers,
  onRetry,
}: {
  isLoading: boolean
  isError: boolean
  couriers: CourierSearchItem[]
  onRetry: () => void
}) {
  return (
    <section aria-labelledby="home-top">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="home-top" className="section-title">Mensajeros con mejor reputación</h2>
      </div>
      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError ? (
        <EmptyState
          title="No pudimos cargar los mensajeros destacados"
          hint="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={onRetry}
          className="rounded-2xl border border-dashed border-line bg-card/60 py-8"
        />
      ) : couriers.length > 0 ? (
        <div className="space-y-3">
          {couriers.slice(0, 3).map((courier) => (
            <CourierCard key={courier.courierId} courier={courier} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
          Aún no hay mensajeros publicados. Prueba otra búsqueda más tarde.
        </p>
      )}
    </section>
  )
}
