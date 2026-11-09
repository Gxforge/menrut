// MENRUT — Mis rutas · Gestión de recorridos del mensajero
'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, MoreVertical, Pencil, PauseCircle, PlayCircle, Trash2, EyeOff, MapPin,
  Route as RouteIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { CoverageBadge } from '@/components/menrut/core/StatusBadge'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { CoverageType, RouteDto } from '@/lib/types'

type TabKey = 'active' | 'scheduled' | 'paused'

// Resumen del tipo: cómo se lee esta pantalla según cómo trabaja el mensajero.
const TIPO_RESUMEN: Record<CoverageType, string> = {
  zone: 'Trabajas dentro de tu zona: no publicas rutas interterritoriales.',
  municipal: 'Tus rutas se publican de municipio a municipio.',
  provincial: 'Tus rutas se publican de provincia a provincia (p. ej. Villa Clara → La Habana).',
}

export default function CourierRoutesScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const setEditingRoute = useAppStore((s) => s.setEditingRoute)
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('active')
  const [deleteTarget, setDeleteTarget] = useState<RouteDto | null>(null)

  const routesQ = useQuery({
    queryKey: ['courier-routes'],
    queryFn: () => api.courierRoutes(),
    enabled: !!session,
  })

  // Tipo de mensajero (badge del resumen + empty state de zona).
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['courier-routes'] })
    void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
  }

  // Pausar / reanudar
  const statusQ = useMutation({
    mutationFn: (p: { id: string; status: 'paused' | 'active' }) => api.updateRoute(p.id, { status: p.status }),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'paused' ? 'Ruta pausada. Deja de aparecer en las búsquedas.' : 'Ruta reanudada.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar la ruta.'),
  })

  // Eliminar
  const deleteQ = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => {
      toast.success('Ruta eliminada.')
      setDeleteTarget(null)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo eliminar la ruta.'),
  })

  const abrirPublicar = () => {
    setEditingRoute(null)
    navigate('route-form')
  }

  const abrirEditar = (r: RouteDto) => {
    setEditingRoute(r.id)
    navigate('route-form')
  }

  // ── Carga ─────────────────────────────────────────────────────────────
  if (routesQ.isLoading) {
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

  // ── Error ─────────────────────────────────────────────────────────────
  if (routesQ.isError || !routesQ.data) {
    return (
      <div>
        <TopBar title="Mis rutas" subtitle="Gestiona tus trayectos publicados" />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudieron cargar tus rutas"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void routesQ.refetch()}
          />
        </div>
      </div>
    )
  }

  const routes = routesQ.data.routes
  const activas = routes.filter((r) => r.status === 'active')
  const programadas = routes.filter((r) => r.status === 'scheduled')
  const pausadas = routes.filter((r) => r.status === 'paused')
  const cerradas = routes.filter((r) => r.status === 'closed')
  const tipo = dashQ.data?.coverageType ?? null

  // ── Vacío total ───────────────────────────────────────────────────────
  if (routes.length === 0) {
    if (tipo === 'zone') {
      // Mensajero de zona sin rutas: su trabajo no se publica como trayectos.
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
              onAction={() => navigate('complete-profile')}
            />
          </div>
        </div>
      )
    }
    return (
      <div>
        <TopBar
          title="Mis rutas"
          subtitle="Gestiona tus trayectos publicados"
          right={
            <Button size="sm" className="h-9 rounded-full px-4" onClick={abrirPublicar}>
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
            onAction={abrirPublicar}
          />
        </div>
      </div>
    )
  }

  const renderLista = (lista: RouteDto[], vacio: string) =>
    lista.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
        {vacio}
      </p>
    ) : (
      <div className="space-y-3">
        {lista.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <RouteCard route={r} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Acciones para la ruta ${r.origin} a ${r.destination}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted-foreground shadow-sm transition-transform active:scale-95 hover:text-foreground"
              >
                <MoreVertical className="h-5 w-5" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => abrirEditar(r)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </DropdownMenuItem>
                {r.status !== 'paused' ? (
                  <DropdownMenuItem onClick={() => statusQ.mutate({ id: r.id, status: 'paused' })}>
                    <PauseCircle className="h-4 w-4" aria-hidden />
                    Pausar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => statusQ.mutate({ id: r.id, status: 'active' })}>
                    <PlayCircle className="h-4 w-4" aria-hidden />
                    Reanudar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    )

  return (
    <div>
      <TopBar
        title="Mis rutas"
        subtitle="Gestiona tus trayectos publicados"
        right={
          <Button size="sm" className="h-9 rounded-full px-4" onClick={abrirPublicar}>
            <Plus className="h-4 w-4" aria-hidden />
            Publicar
          </Button>
        }
      />

      <div className="px-4 pt-4 pb-8">
        {/* Resumen con el tipo de mensajero (rutas municipales ↔ provinciales) */}
        {tipo && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-card px-3.5 py-2.5">
            <CoverageBadge type={tipo} />
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
              {TIPO_RESUMEN[tipo]}
            </p>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="active" className="flex-1">Activas ({activas.length})</TabsTrigger>
            <TabsTrigger value="scheduled" className="flex-1">Programadas ({programadas.length})</TabsTrigger>
            <TabsTrigger value="paused" className="flex-1">Pausadas ({pausadas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            {renderLista(activas, 'No tienes rutas activas ahora mismo.')}
          </TabsContent>
          <TabsContent value="scheduled" className="mt-0">
            {renderLista(programadas, 'No tienes rutas programadas.')}
          </TabsContent>
          <TabsContent value="paused" className="mt-0">
            {renderLista(pausadas, 'No tienes rutas en pausa.')}
          </TabsContent>
        </Tabs>

        {/* Historial: rutas cerradas, solo lectura */}
        {cerradas.length > 0 && (
          <section className="mt-7" aria-label="Historial de rutas cerradas">
            <h2 className="section-title mb-2.5">Historial</h2>
            <p className="mb-3 text-[11.5px] text-muted-foreground">
              Rutas cerradas. Solo lectura: no aparecen en las búsquedas.
            </p>
            <div className="space-y-3">
              {cerradas.map((r) => (
                <div key={r.id} className={cn('opacity-75')}>
                  <RouteCard route={r} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Confirmación de borrado */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ruta?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.origin} → {deleteTarget?.destination}» se quitará de tu perfil y de las
              búsquedas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteQ.mutate(deleteTarget.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
