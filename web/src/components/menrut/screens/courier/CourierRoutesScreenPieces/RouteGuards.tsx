// MENRUT — CourierRoutesScreen · Estados previos a la lista: carga, error
// y vacíos (mensajero de zona sin rutas / ninguna ruta publicada).
'use client'

import { EyeOff, MapPin, Plus, Route as RouteIcon } from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'

export function RoutesLoading() {
  return (
    <div>
      <TopBar title="Mis rutas" subtitle="Gestiona tus trayectos publicados" />
      <div className="px-4 pt-4 pb-8">
        <div className="mb-4"><RouteSkeleton /></div>
        <div className="mb-4"><RouteSkeleton /></div>
        <RouteSkeleton />
      </div>
    </div>
  )
}

export function RoutesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div>
      <TopBar title="Mis rutas" subtitle="Gestiona tus trayectos publicados" />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudieron cargar tus rutas"
          hint="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}

// Mensajero de zona sin rutas: su trabajo no se publica como trayectos.
export function ZoneEmpty({ onChangeType }: { onChangeType: () => void }) {
  return (
    <div>
      <TopBar
        title="Mis rutas"
        subtitle="Gestiona tus trayectos publicados"
      />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<MapPin className="h-8 w-8" aria-hidden />}
          title="No necesitas publicar rutas"
          hint="Trabajas dentro de tu municipio base: los clientes de tu zona te encuentran en búsquedas locales, sin rutas interterritoriales."
          actionLabel="Cambiar mi tipo de trabajo"
          onAction={onChangeType}
        />
      </div>
    </div>
  )
}

export function NoRoutesEmpty({ onPublish }: { onPublish: () => void }) {
  return (
    <div>
      <TopBar
        title="Mis rutas"
        subtitle="Gestiona tus trayectos publicados"
        right={
          <Button size="sm" className="h-9 rounded-full px-4" onClick={onPublish}>
            <Plus className="h-4 w-4" aria-hidden />
            Publicar
          </Button>
        }
      />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<RouteIcon className="h-8 w-8" aria-hidden />}
          title="Aún no publicas rutas"
          hint="Publica tu primer recorrido para que los clientes de esa trayectoria te encuentren."
          actionLabel="Publicar ruta"
          onAction={onPublish}
        />
      </div>
    </div>
  )
}
