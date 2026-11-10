// MENRUT — Publicar / editar ruta · Formulario por pasos (1-2-3)
//
// T8-c (tipos de mensajero): el formato del trayecto depende del tipo.
//   zone       → no publica rutas: pantalla de estado + «Cambiar mi tipo de trabajo».
//   municipal  → origen/destino por MUNICIPIO (selects dependientes provincia→municipio).
//   provincial → origen/destino por PROVINCIA (select de provincias).
// En edición se usa el scope de la propia ruta (una ruta municipal se edita
// por municipios; una provincial, por provincias).
// Las pantallas de estado viven en RouteFormScreenPieces/FormGuards y el
// formulario en RouteFormScreenPieces/RouteFormEditor.
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import {
  EditError, EditLoading, EditNotFound, FormCatalogError, FormLoading, FormProfileError, ZoneBlocked,
} from './RouteFormScreenPieces/FormGuards'
import { RouteFormEditor } from './RouteFormScreenPieces/RouteFormEditor'
import type { Scope } from './RouteFormScreenPieces/helpers'
import type { CoverageType, ProvinceDto, RouteDto } from '@/lib/types'

export default function RouteFormScreen() {
  const session = useAppStore((s) => s.session)
  const back = useAppStore((s) => s.back)
  const navigate = useAppStore((s) => s.navigate)
  const editingRouteId = useAppStore((s) => s.editingRouteId)
  const editando = editingRouteId !== null

  // Tipo de mensajero: decide el formato del trayecto (y bloquea a los de zona).
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })

  // Catálogo territorial (público: 16 provincias y 168 municipios)
  const terrQ = useQuery({ queryKey: ['territories'], queryFn: () => api.territories() })

  // Para editar: recuperar la ruta propia
  const routesQ = useQuery({
    queryKey: ['courier-routes'],
    queryFn: () => api.courierRoutes(),
    enabled: !!session && editando,
  })

  const titulo = editando ? 'Editar ruta' : 'Publicar ruta'

  // ── Carga del catálogo y del tipo ─────────────────────────────────────
  if (terrQ.isLoading || dashQ.isLoading) {
    return <FormLoading title={titulo} onBack={back} />
  }

  if (terrQ.isError || !terrQ.data) {
    return <FormCatalogError title={titulo} onBack={back} onRetry={() => void terrQ.refetch()} />
  }

  if (dashQ.isError || !dashQ.data) {
    return <FormProfileError title={titulo} onBack={back} onRetry={() => void dashQ.refetch()} />
  }

  // ── Mensajeros de zona: no publican rutas ─────────────────────────────
  if (dashQ.data.coverageType === 'zone') {
    return (
      <ZoneBlocked
        title={titulo}
        onBack={back}
        onChangeType={() => navigate('complete-profile')}
      />
    )
  }

  const provinces: ProvinceDto[] = terrQ.data.provinces

  // ── Carga de la ruta en edición ───────────────────────────────────────
  if (editando && routesQ.isLoading) {
    return <EditLoading onBack={back} />
  }

  if (editando && routesQ.isError) {
    return <EditError onBack={back} onRetry={() => void routesQ.refetch()} />
  }

  const rutaEdit: RouteDto | null = editando
    ? (routesQ.data?.routes.find((r) => r.id === editingRouteId) ?? null)
    : null
  if (editando && !rutaEdit) {
    return (
      <EditNotFound
        onBack={back}
        onGoToRoutes={() => {
          useAppStore.getState().setEditingRoute(null)
          useAppStore.getState().navigate('courier-routes')
        }}
      />
    )
  }

  // Modo del formulario: en edición manda el scope de la ruta; al crear,
  // el tipo de mensajero (municipal → municipios · provincial → provincias).
  const tipo: CoverageType = dashQ.data.coverageType
  const scope: Scope = rutaEdit ? rutaEdit.scope : tipo === 'provincial' ? 'provincial' : 'municipal'

  // El editor se remonta con key según la ruta (estado fresco por edición)
  return <RouteFormEditor key={editingRouteId ?? 'nueva'} route={rutaEdit} provinces={provinces} scope={scope} />
}
