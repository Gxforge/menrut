// MENRUT — Estados vacíos, de error y esqueletos de carga
import { ReactNode } from 'react'
import { SearchX, WifiOff, PackageSearch, Inbox, BellOff, HeartOff, MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  className,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-8 py-14 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-blue">
        {icon ?? <PackageSearch className="h-8 w-8" aria-hidden />}
      </div>
      <p className="font-display text-[15px] font-semibold leading-snug">{title}</p>
      {hint && <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2 rounded-full px-6" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function NoResultsEmpty({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" aria-hidden />}
      title="Todavía no encontramos mensajeros para este trayecto"
      hint="Prueba con un municipio cercano o quita algunos filtros para ampliar la búsqueda."
      actionLabel="Ajustar filtros"
      onAction={onAction}
    />
  )
}

export function OfflineEmpty() {
  return (
    <EmptyState
      icon={<WifiOff className="h-8 w-8" aria-hidden />}
      title="Sin conexión"
      hint="Revisa tu conexión. La información que ya viste sigue disponible mientras te reconectas."
    />
  )
}

export function InboxEmpty() {
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8" aria-hidden />}
      title="Aún no tienes conversaciones"
      hint="Cuando contactes con un mensajero, la conversación aparecerá aquí."
    />
  )
}

export function NotificationsEmpty() {
  return (
    <EmptyState
      icon={<BellOff className="h-8 w-8" aria-hidden />}
      title="Sin notificaciones por ahora"
      hint="Te avisaremos cuando haya rutas coincidentes, mensajes o novedades de tu membresía."
    />
  )
}

export function SavedEmpty() {
  return (
    <EmptyState
      icon={<HeartOff className="h-8 w-8" aria-hidden />}
      title="Todavía no guardas rutas ni mensajeros"
      hint="Guarda un trayecto o marca un mensajero como favorito para encontrarlo rápido."
    />
  )
}

export function MapEmpty() {
  return (
    <EmptyState
      icon={<MapPinOff className="h-8 w-8" aria-hidden />}
      title="El mapa no está disponible ahora"
      hint="Puedes explorar la red de rutas en modo lista con menos consumo de datos."
    />
  )
}

// Esqueletos de carga (para datos reales en camino)
export function CourierCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <CourierCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function RouteSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  )
}
