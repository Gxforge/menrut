// MENRUT — MapScreen · panel inferior con el detalle de la ruta.
'use client'

import type { ReactNode } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { formatCup, formatDateTime, FREQ_LABELS, SERVICE_LABELS, VEHICLE_LABELS } from '@/lib/format'
import type { RouteDto } from '@/lib/types'
import { courierName } from './helpers'

/** Panel inferior (BottomSheet) con los datos de la ruta y CTA de búsqueda. */
export function RouteDrawer({
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-medium leading-snug">{children}</p>
    </div>
  )
}
