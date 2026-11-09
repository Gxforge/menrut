// MENRUT — Guardados: rutas guardadas y mensajeros favoritos
// - Rutas: interruptor de alertas («Avisarme de nuevas ofertas»), búsqueda sobre
//   la ruta guardada y eliminación con confirmación.
// - Favoritos: tarjetas de mensajero (CourierCard) hacia el pasaporte.
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRight, Bell, BellOff, BookmarkPlus, Heart, Loader2, MapPin, RefreshCw, Trash2,
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CourierCard } from '@/components/menrut/core/CourierCard'
import { CourierCardSkeleton, EmptyState, RouteSkeleton, SavedEmpty } from '@/components/menrut/core/EmptyState'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavedRouteDto } from '@/lib/types'

export default function SavedScreen() {
  const session = useAppStore((s) => s.session)
  const [tab, setTab] = useState<'routes' | 'favorites'>('routes')

  return (
    <div className="pb-10">
      <TabHeader title="Guardados" subtitle="Rutas y mensajeros que quieres conservar" />
      <div className="px-4 pt-4">
        {/* Pestañas segmentadas */}
        <div role="tablist" aria-label="Guardados" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'routes'}
            onClick={() => setTab('routes')}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
              tab === 'routes' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Rutas guardadas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
              tab === 'favorites' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart className="h-4 w-4" aria-hidden />
            Mensajeros favoritos
          </button>
        </div>

        <div className="mt-4">
          {tab === 'routes' ? (
            <SavedRoutesTab userId={session?.id ?? null} />
          ) : (
            <FavoritesTab userId={session?.id ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Pestaña: rutas guardadas ───────────────────────────────────────────────

function SavedRoutesTab({ userId }: { userId: string | null }) {
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const navigate = useAppStore((s) => s.navigate)
  const qc = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<SavedRouteDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const saved = useQuery({
    queryKey: ['saved-routes', userId],
    queryFn: () => api.savedRoutes(),
    enabled: !!userId,
  })

  // Nombres de origen/destino para la ruta guardada actual del buscador
  const territories = useQuery({
    queryKey: ['territories'],
    queryFn: () => api.territories(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of territories.data?.provinces ?? []) {
      for (const m of p.municipalities) map.set(m.id, m.name)
    }
    return map
  }, [territories.data])

  const currentLabel = useMemo(() => {
    if (!search.originId || !search.destinationId) return null
    const o = nameById.get(search.originId)
    const d = nameById.get(search.destinationId)
    if (!o || !d) return null
    return { label: `${o} → ${d}`, o, d }
  }, [search.originId, search.destinationId, nameById])

  const saveCurrent = useMutation({
    mutationFn: () =>
      api.addSavedRoute(search.originId as string, search.destinationId as string, currentLabel?.label ?? 'Mi ruta', true),
    onSuccess: () => {
      toast.success('Ruta guardada. Te avisaremos cuando aparezcan nuevas ofertas.')
      qc.invalidateQueries({ queryKey: ['saved-routes'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'No se pudo guardar la ruta. Inténtalo de nuevo.')
    },
  })

  async function toggleAlerts(route: SavedRouteDto) {
    // La API no expone un endpoint PATCH de alertas para rutas guardadas:
    // se recrea la ruta con alertsEnabled invertido y se elimina la anterior.
    // El interruptor se actualiza de forma optimista y se revierte si falla.
    const key = ['saved-routes', userId]
    const prev = qc.getQueryData<{ routes: SavedRouteDto[] }>(key)
    qc.setQueryData<{ routes: SavedRouteDto[] }>(key, (d) =>
      d
        ? { routes: d.routes.map((r) => (r.id === route.id ? { ...r, alertsEnabled: !r.alertsEnabled } : r)) }
        : d
    )
    try {
      await api.addSavedRoute(route.originId, route.destinationId, route.label, !route.alertsEnabled)
      await api.deleteSavedRoute(route.id)
      await qc.invalidateQueries({ queryKey: ['saved-routes'] })
      toast.success(!route.alertsEnabled ? 'Avisos activados para esta ruta' : 'Avisos desactivados')
    } catch {
      qc.setQueryData(key, prev)
      toast.error('No se pudieron actualizar los avisos. Inténtalo de nuevo.')
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteSavedRoute(pendingDelete.id)
      toast.success('Ruta eliminada')
      setPendingDelete(null)
      await qc.invalidateQueries({ queryKey: ['saved-routes'] })
    } catch {
      toast.error('No se pudo eliminar la ruta. Inténtalo de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  function searchCouriers(route: SavedRouteDto) {
    setSearch({ originId: route.originId, destinationId: route.destinationId })
    navigate('results')
  }

  if (!userId) {
    return (
      <EmptyState
        icon={<Heart className="h-8 w-8" aria-hidden />}
        title="Inicia sesión para guardar rutas"
        hint="Guarda trayectos y recibe avisos cuando aparezcan nuevas ofertas. La búsqueda sigue siendo libre, sin cuenta."
        actionLabel="Iniciar sesión"
        onAction={() => navigate('login')}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Guardar la ruta actual del buscador (si existe) */}
      {currentLabel && (
        <section className="rounded-2xl border border-blue/25 bg-blue/5 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue">
              <BookmarkPlus className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-blue">Tu búsqueda actual</p>
              <p className="truncate text-[13.5px] font-semibold leading-tight">{currentLabel.label}</p>
            </div>
          </div>
          <Button
            className="mt-3 h-10 w-full rounded-full text-[13px] font-semibold"
            onClick={() => saveCurrent.mutate()}
            disabled={saveCurrent.isPending}
          >
            {saveCurrent.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BookmarkPlus className="h-4 w-4" aria-hidden />}
            Guardar ruta actual
          </Button>
        </section>
      )}

      {saved.isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando rutas guardadas">
          <RouteSkeleton />
          <RouteSkeleton />
        </div>
      ) : saved.isError ? (
        <EmptyState
          icon={<RefreshCw className="h-8 w-8" aria-hidden />}
          title="No pudimos cargar tus rutas guardadas"
          hint="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => saved.refetch()}
        />
      ) : (saved.data?.routes.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center">
          <SavedEmpty />
          <Button variant="secondary" className="rounded-full px-6" onClick={() => navigate('home')}>
            Buscar mensajeros
          </Button>
        </div>
      ) : (
        saved.data?.routes.map((route) => (
          <SavedRouteCard
            key={route.id}
            route={route}
            onToggleAlerts={() => toggleAlerts(route)}
            onSearch={() => searchCouriers(route)}
            onDelete={() => setPendingDelete(route)}
          />
        ))
      )}

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ruta guardada?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Dejarás de recibir avisos de nuevas ofertas para ${pendingDelete.origin} → ${pendingDelete.destination}.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 rounded-full" disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-full bg-danger font-semibold hover:bg-danger/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SavedRouteCard({
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

// ─── Pestaña: mensajeros favoritos ──────────────────────────────────────────

function FavoritesTab({ userId }: { userId: string | null }) {
  const navigate = useAppStore((s) => s.navigate)
  const favorites = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => api.favorites(),
    enabled: !!userId,
  })

  if (!userId) {
    return (
      <EmptyState
        icon={<Heart className="h-8 w-8" aria-hidden />}
        title="Inicia sesión para guardar favoritos"
        hint="Marca mensajeros como favoritos y encuéntralos aquí al instante. La búsqueda sigue siendo libre, sin cuenta."
        actionLabel="Iniciar sesión"
        onAction={() => navigate('login')}
      />
    )
  }

  if (favorites.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando favoritos">
        <CourierCardSkeleton />
        <CourierCardSkeleton />
      </div>
    )
  }

  if (favorites.isError) {
    return (
      <EmptyState
        icon={<RefreshCw className="h-8 w-8" aria-hidden />}
        title="No pudimos cargar tus favoritos"
        hint="Revisa tu conexión e inténtalo de nuevo."
        actionLabel="Reintentar"
        onAction={() => favorites.refetch()}
      />
    )
  }

  if ((favorites.data?.couriers.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center">
        <SavedEmpty />
        <Button variant="secondary" className="rounded-full px-6" onClick={() => navigate('home')}>
          Explorar mensajeros
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favorites.data?.couriers.map((courier) => (
        <CourierCard key={courier.courierId} courier={courier} />
      ))}
    </div>
  )
}
