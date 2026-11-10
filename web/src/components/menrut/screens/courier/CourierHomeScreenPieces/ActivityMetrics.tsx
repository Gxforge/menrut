// MENRUT — CourierHomeScreen · Métricas reales de actividad del mensajero.
'use client'

import { CalendarClock, PackageCheck, Route as RouteIcon, Star } from 'lucide-react'
import { Rating } from '@/components/menrut/core/Rating'
import { formatRating } from '@/lib/format'
import type { CourierDashboardDto } from '@/lib/types'

export function ActivityMetrics({ dash }: { dash: CourierDashboardDto }) {
  return (
    <section className="mt-5" aria-label="Resumen de actividad">
      <h2 className="section-title mb-2.5">Tu actividad</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue/10 text-blue">
            <RouteIcon className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.activeRoutes}</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Rutas activas</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan/10 text-cyan">
            <CalendarClock className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.scheduledRoutes}</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Rutas programadas</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/10 text-orange">
            <Star className="h-4 w-4" aria-hidden />
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <p className="font-display text-[22px] font-bold leading-none">{formatRating(dash.ratingAvg)}</p>
          </div>
          <div className="mt-1"><Rating value={dash.ratingAvg} count={dash.ratingCount} size="sm" /></div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">Valoración</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <PackageCheck className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.verifiedDeliveries}</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">Entregas verificadas</p>
        </div>
      </div>
    </section>
  )
}
