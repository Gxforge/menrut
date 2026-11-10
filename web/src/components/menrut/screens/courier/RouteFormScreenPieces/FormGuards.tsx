// MENRUT — RouteFormScreen · Pantallas de estado previas al formulario
// (carga, errores de catálogo/perfil, mensajeros de zona y edición fallida).
'use client'

import { EyeOff, MapPin, Route as RouteIcon } from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

// Carga del catálogo territorial y del tipo de mensajero.
export function FormLoading({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <TopBar title={title} subtitle="Comparte el trayecto que ofreces" onBack={onBack} />
      <div className="px-4 pt-4 pb-8">
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <div className="mt-4 space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// Fallo al cargar las provincias y municipios oficiales.
export function FormCatalogError({
  title,
  onBack,
  onRetry,
}: {
  title: string
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div>
      <TopBar title={title} subtitle="Comparte el trayecto que ofreces" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar el catálogo territorial"
          hint="Necesitamos las provincias y municipios oficiales para publicar tu ruta."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}

// Fallo al cargar el tipo de trabajo del mensajero.
export function FormProfileError({
  title,
  onBack,
  onRetry,
}: {
  title: string
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div>
      <TopBar title={title} subtitle="Comparte el trayecto que ofreces" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar tu perfil"
          hint="Necesitamos conocer tu tipo de trabajo para preparar el formulario."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}

// Mensajeros de zona: no publican rutas.
export function ZoneBlocked({
  title,
  onBack,
  onChangeType,
}: {
  title: string
  onBack: () => void
  onChangeType: () => void
}) {
  return (
    <div>
      <TopBar title={title} subtitle="Comparte el trayecto que ofreces" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<MapPin className="h-8 w-8" aria-hidden />}
          title="No necesitas publicar rutas"
          hint="Los mensajeros de zona trabajan dentro de su municipio base y no publican rutas interterritoriales. Los clientes de tu zona te encuentran en búsquedas locales."
          actionLabel="Cambiar mi tipo de trabajo"
          onAction={onChangeType}
        />
        <p className="mt-4 rounded-2xl border border-dashed border-line bg-card/60 px-4 py-4 text-center text-[12px] leading-relaxed text-muted-foreground">
          Si tienes rutas de antes, siguen en «Mis rutas»: puedes pausarlas o eliminarlas desde ahí.
        </p>
      </div>
    </div>
  )
}

// Carga de la ruta en edición.
export function EditLoading({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <TopBar title="Editar ruta" subtitle="Cargando tus datos…" onBack={onBack} />
      <div className="px-4 pt-4 pb-8">
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <div className="mt-4 space-y-3">
          <RouteSkeleton />
          <RouteSkeleton />
        </div>
      </div>
    </div>
  )
}

// Error de red al recuperar las rutas propias.
export function EditError({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
  return (
    <div>
      <TopBar title="Editar ruta" subtitle="Ruta no encontrada" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar la ruta"
          hint="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}

// La ruta que se iba a editar ya no existe.
export function EditNotFound({
  onBack,
  onGoToRoutes,
}: {
  onBack: () => void
  onGoToRoutes: () => void
}) {
  return (
    <div>
      <TopBar title="Editar ruta" subtitle="Ruta no encontrada" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<RouteIcon className="h-8 w-8" aria-hidden />}
          title="La ruta que intentas editar ya no existe"
          hint="Puede que la hayas eliminado desde «Mis rutas»."
          actionLabel="Volver a mis rutas"
          onAction={onGoToRoutes}
        />
      </div>
    </div>
  )
}
