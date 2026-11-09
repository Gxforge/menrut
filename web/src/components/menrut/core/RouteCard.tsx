// MENRUT — Tarjeta de ruta (origen → destino)
'use client'

import { ArrowRight, MapPin, Repeat, CalendarClock } from 'lucide-react'
import { RouteStatusBadge } from './StatusBadge'
import { formatCup, FREQ_LABELS, VEHICLE_LABELS, formatDateTime } from '@/lib/format'
import type { RouteDto } from '@/lib/types'
import { cn } from '@/lib/utils'

export function RouteCard({
  route,
  onOpen,
  className,
}: {
  route: RouteDto
  onOpen?: () => void
  className?: string
}) {
  const interactive = !!onOpen
  return (
    <article
      onClick={onOpen}
      className={cn(
        'rounded-2xl border border-line bg-card p-4',
        interactive && 'cursor-pointer transition-shadow hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[14px] font-semibold leading-tight">
              <span className="truncate">{route.origin}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-blue" aria-hidden />
              <span className="truncate">{route.destination}</span>
            </div>
            {route.stops && (
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                Paradas: {route.stops}
              </p>
            )}
          </div>
        </div>
        <RouteStatusBadge status={route.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {route.frequency && (
          <span className="inline-flex items-center gap-1">
            <Repeat className="h-3.5 w-3.5" aria-hidden />
            {FREQ_LABELS[route.frequency] ?? route.frequency}
            {route.daysNote ? ` · ${route.daysNote}` : ''}
          </span>
        )}
        {route.vehicleType && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-navy">
            {VEHICLE_LABELS[route.vehicleType] ?? route.vehicleType}
          </span>
        )}
        {route.nextDepartureAt && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {formatDateTime(route.nextDepartureAt)}
          </span>
        )}
        <span className="ml-auto font-semibold text-foreground">
          {route.feeCup !== null && route.feeCup !== undefined ? formatCup(route.feeCup) : 'Tarifa por acordar'}
        </span>
      </div>

      {route.notes && (
        <p className="mt-2 line-clamp-2 rounded-xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
          {route.notes}
        </p>
      )}
    </article>
  )
}
