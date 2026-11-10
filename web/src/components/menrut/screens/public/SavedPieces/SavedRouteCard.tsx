// MENRUT — Piezas de SavedScreen: tarjeta de ruta guardada con interruptor
// de avisos, búsqueda sobre la ruta y eliminación.
'use client'

import { ArrowRight, Bell, BellOff, MapPin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { timeAgo } from '@/lib/format'
import type { SavedRouteDto } from '@/lib/types'

export function SavedRouteCard({
  route,
  onToggleAlerts,
  onSearch,
  onDelete,
}: {
  route: SavedRouteDto
  onToggleAlerts: () => void
  onSearch: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight">
            {route.origin} <ArrowRight className="inline h-3.5 w-3.5 text-blue" aria-hidden /> {route.destination}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Guardada {timeAgo(route.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ruta ${route.origin} a ${route.destination}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:bg-danger/10 hover:text-danger active:scale-90"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-secondary/70 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium">
          {route.alertsEnabled ? (
            <Bell className="h-4 w-4 shrink-0 text-blue" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="truncate">Avisarme de nuevas ofertas</span>
        </span>
        <Switch
          checked={route.alertsEnabled}
          onCheckedChange={onToggleAlerts}
          aria-label={`Avisos de nuevas ofertas para ${route.origin} a ${route.destination}`}
        />
      </div>

      <Button className="mt-3 h-10 w-full rounded-full text-[13px] font-semibold" onClick={onSearch}>
        Buscar mensajeros
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </article>
  )
}
