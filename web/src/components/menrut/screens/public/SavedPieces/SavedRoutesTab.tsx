// MENRUT — Piezas de SavedScreen: pestaña de rutas guardadas (guardar la
// búsqueda actual, avisos por ruta y eliminación con confirmación).
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookmarkPlus, Heart, Loader2, RefreshCw } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { EmptyState, RouteSkeleton, SavedEmpty } from '@/components/menrut/core/EmptyState'
import { SavedRouteCard } from '@/components/menrut/screens/public/SavedPieces/SavedRouteCard'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SavedRouteDto } from '@/lib/types'

export function SavedRoutesTab({ userId }: { userId: string | null }) {
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
