// MENRUT — Publicar / editar ruta · Formulario por pasos (1-2-3)
//
// T8-c (tipos de mensajero): el formato del trayecto depende del tipo.
//   zone       → no publica rutas: pantalla de estado + «Cambiar mi tipo de trabajo».
//   municipal  → origen/destino por MUNICIPIO (selects dependientes provincia→municipio).
//   provincial → origen/destino por PROVINCIA (select de provincias).
// En edición se usa el scope de la propia ruta (una ruta municipal se edita
// por municipios; una provincial, por provincias).
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Check, Eye, Globe, Loader2, EyeOff,
  MapPin, Route as RouteIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { FREQ_LABELS, SERVICE_LABELS, VEHICLE_LABELS } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CoverageType, ProvinceDto, RouteDto } from '@/lib/types'

type ServicioTipo = 'paquetes' | 'encargos' | 'entregas_comerciales' | 'otros'
type Scope = 'municipal' | 'provincial'

interface FormState {
  originProvince: string
  originId: string | null // municipio de origen (solo rutas municipales)
  destProvince: string
  destId: string | null // municipio de destino (solo rutas municipales)
  stops: string
  frequency: string | null
  daysNote: string
  serviceType: ServicioTipo
  vehicleType: string | null
  feeCup: string
  nextDepartureAt: string
  notes: string
}

const INITIAL: FormState = {
  originProvince: '', originId: null, destProvince: '', destId: null,
  stops: '', frequency: null, daysNote: '', serviceType: 'paquetes',
  vehicleType: null, feeCup: '', nextDepartureAt: '', notes: '',
}

const SERVICIOS: ServicioTipo[] = ['paquetes', 'encargos', 'entregas_comerciales', 'otros']
const FRECUENCIAS = ['diaria', 'semanal', 'programada', 'personalizada'] as const
const VEHICULOS = ['motor', 'auto', 'panel', 'camion', 'bicielectrica'] as const

// ISO → valor válido para <input type="datetime-local"> en hora local
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseFee(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return NaN // señal de error
  return Math.round(n)
}

// Estado inicial del formulario: vacío (crear) o precargado (editar).
// El trayecto se lee según el scope de la ruta.
function desdeRuta(route: RouteDto | null, provinces: ProvinceDto[]): FormState {
  if (!route) return INITIAL
  if (route.scope === 'provincial') {
    // Ruta provincial: origen y destino son provincias.
    return {
      originProvince: route.originProvinceId ?? '',
      originId: null,
      destProvince: route.destinationProvinceId ?? '',
      destId: null,
      stops: route.stops ?? '',
      frequency: route.frequency ?? null,
      daysNote: route.daysNote ?? '',
      serviceType: SERVICIOS.includes(route.serviceType as ServicioTipo)
        ? (route.serviceType as ServicioTipo)
        : 'paquetes',
      vehicleType: route.vehicleType ?? null,
      feeCup: route.feeCup !== null && route.feeCup !== undefined ? String(route.feeCup) : '',
      nextDepartureAt: isoToLocalInput(route.nextDepartureAt),
      notes: route.notes ?? '',
    }
  }
  const provDe = (munId: string | null) =>
    provinces.find((p) => p.municipalities.some((m) => m.id === munId))?.id ?? ''
  return {
    originProvince: provDe(route.originId),
    originId: route.originId,
    destProvince: provDe(route.destinationId),
    destId: route.destinationId,
    stops: route.stops ?? '',
    frequency: route.frequency ?? null,
    daysNote: route.daysNote ?? '',
    serviceType: SERVICIOS.includes(route.serviceType as ServicioTipo)
      ? (route.serviceType as ServicioTipo)
      : 'paquetes',
    vehicleType: route.vehicleType ?? null,
    feeCup: route.feeCup !== null && route.feeCup !== undefined ? String(route.feeCup) : '',
    nextDepartureAt: isoToLocalInput(route.nextDepartureAt),
    notes: route.notes ?? '',
  }
}

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
    return (
      <div>
        <TopBar title={titulo} subtitle="Comparte el trayecto que ofreces" onBack={back} />
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

  if (terrQ.isError || !terrQ.data) {
    return (
      <div>
        <TopBar title={titulo} subtitle="Comparte el trayecto que ofreces" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar el catálogo territorial"
            hint="Necesitamos las provincias y municipios oficiales para publicar tu ruta."
            actionLabel="Reintentar"
            onAction={() => void terrQ.refetch()}
          />
        </div>
      </div>
    )
  }

  if (dashQ.isError || !dashQ.data) {
    return (
      <div>
        <TopBar title={titulo} subtitle="Comparte el trayecto que ofreces" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar tu perfil"
            hint="Necesitamos conocer tu tipo de trabajo para preparar el formulario."
            actionLabel="Reintentar"
            onAction={() => void dashQ.refetch()}
          />
        </div>
      </div>
    )
  }

  // ── Mensajeros de zona: no publican rutas ─────────────────────────────
  if (dashQ.data.coverageType === 'zone') {
    return (
      <div>
        <TopBar title={titulo} subtitle="Comparte el trayecto que ofreces" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<MapPin className="h-8 w-8" aria-hidden />}
            title="No necesitas publicar rutas"
            hint="Los mensajeros de zona trabajan dentro de su municipio base y no publican rutas interterritoriales. Los clientes de tu zona te encuentran en búsquedas locales."
            actionLabel="Cambiar mi tipo de trabajo"
            onAction={() => navigate('complete-profile')}
          />
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-card/60 px-4 py-4 text-center text-[12px] leading-relaxed text-muted-foreground">
            Si tienes rutas de antes, siguen en «Mis rutas»: puedes pausarlas o eliminarlas desde ahí.
          </p>
        </div>
      </div>
    )
  }

  const provinces = terrQ.data.provinces

  // ── Carga de la ruta en edición ───────────────────────────────────────
  if (editando && routesQ.isLoading) {
    return (
      <div>
        <TopBar title="Editar ruta" subtitle="Cargando tus datos…" onBack={back} />
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

  if (editando && routesQ.isError) {
    return (
      <div>
        <TopBar title="Editar ruta" subtitle="Ruta no encontrada" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar la ruta"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void routesQ.refetch()}
          />
        </div>
      </div>
    )
  }

  const rutaEdit = editando ? (routesQ.data?.routes.find((r) => r.id === editingRouteId) ?? null) : null
  if (editando && !rutaEdit) {
    return (
      <div>
        <TopBar title="Editar ruta" subtitle="Ruta no encontrada" onBack={back} />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<RouteIcon className="h-8 w-8" aria-hidden />}
            title="La ruta que intentas editar ya no existe"
            hint="Puede que la hayas eliminado desde «Mis rutas»."
            actionLabel="Volver a mis rutas"
            onAction={() => {
              useAppStore.getState().setEditingRoute(null)
              useAppStore.getState().navigate('courier-routes')
            }}
          />
        </div>
      </div>
    )
  }

  // Modo del formulario: en edición manda el scope de la ruta; al crear,
  // el tipo de mensajero (municipal → municipios · provincial → provincias).
  const tipo: CoverageType = dashQ.data.coverageType
  const scope: Scope = rutaEdit ? rutaEdit.scope : tipo === 'provincial' ? 'provincial' : 'municipal'

  // El editor se remonta con key según la ruta (estado fresco por edición)
  return <RouteFormEditor key={editingRouteId ?? 'nueva'} route={rutaEdit} provinces={provinces} scope={scope} />
}

function RouteFormEditor({
  route,
  provinces,
  scope,
}: {
  route: RouteDto | null
  provinces: ProvinceDto[]
  scope: Scope
}) {
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const setEditingRoute = useAppStore((s) => s.setEditingRoute)
  const qc = useQueryClient()
  const editingRouteId = route?.id ?? null
  const editando = route !== null

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(() => desdeRuta(route, provinces))
  const [error, setError] = useState<string | null>(null)

  const munById = useMemo(() => {
    const m = new Map<string, { name: string; province: string }>()
    for (const p of provinces) for (const mu of p.municipalities) m.set(mu.id, { name: mu.name, province: p.name })
    return m
  }, [provinces])

  const provById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of provinces) m.set(p.id, p.name)
    return m
  }, [provinces])

  // Volver arriba al cambiar de paso
  useEffect(() => {
    document.getElementById('contenido')?.scrollTo({ top: 0 })
  }, [step])

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  // ── Validaciones por paso (el paso 1 depende del scope) ───────────────
  const validar = (n: number): string | null => {
    if (n === 1) {
      if (scope === 'provincial') {
        if (!form.originProvince) return 'Selecciona la provincia de origen.'
        if (!form.destProvince) return 'Selecciona la provincia de destino.'
        if (form.originProvince === form.destProvince) return 'El origen y el destino no pueden ser la misma provincia.'
      } else {
        if (!form.originProvince || !form.originId) return 'Selecciona la provincia y el municipio de origen.'
        if (!form.destProvince || !form.destId) return 'Selecciona la provincia y el municipio de destino.'
        if (form.originId === form.destId) return 'El origen y el destino no pueden ser el mismo municipio.'
      }
    }
    if (n === 2) {
      if (!form.frequency) return 'Selecciona la frecuencia del recorrido.'
      if (!form.vehicleType) return 'Selecciona el vehículo con el que realizas el trayecto.'
    }
    return null
  }

  const irAPaso = (n: number) => {
    const err = validar(step)
    if (err) {
      setError(err)
      toast.error(err)
      return
    }
    setError(null)
    setStep(n)
  }

  // ── Guardar (crear o actualizar) ──────────────────────────────────────
  // municipal → originId/destinationId (municipios)
  // provincial → originProvinceId/destinationProvinceId (provincias)
  const saveQ = useMutation({
    mutationFn: () => {
      const fee = parseFee(form.feeCup)
      if (Number.isNaN(fee)) {
        throw new Error('La tarifa debe ser un número entero en CUP (o déjala vacía para acordarla con el cliente).')
      }
      const territorio =
        scope === 'provincial'
          ? { originProvinceId: form.originProvince, destinationProvinceId: form.destProvince }
          : { originId: form.originId, destinationId: form.destId }
      const payload = {
        ...territorio,
        stops: form.stops.trim(),
        frequency: form.frequency,
        daysNote: form.daysNote.trim(),
        serviceType: form.serviceType,
        vehicleType: form.vehicleType,
        feeCup: fee,
        nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
        notes: form.notes.trim(),
      }
      return editingRouteId
        ? api.updateRoute(editingRouteId, payload)
        : api.createRoute(payload)
    },
    onSuccess: () => {
      toast.success(editando ? 'Ruta actualizada.' : 'Ruta publicada. Ya la ven los clientes de ese trayecto.')
      setEditingRoute(null)
      void qc.invalidateQueries({ queryKey: ['courier-routes'] })
      void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
      void qc.invalidateQueries({ queryKey: ['search'] })
      void qc.invalidateQueries({ queryKey: ['popular-routes'] })
      navigate('courier-routes')
    },
    onError: (e: Error) => {
      // El backend valida duplicados y territorios por tipo; su mensaje se
      // muestra tal cual (p. ej. 400 de zona o de formato equivocado).
      toast.error(e.message || 'No se pudo guardar la ruta. Inténtalo de nuevo.')
    },
  })

  // Vista previa sintetizada con los datos ingresados
  const feePreview = parseFee(form.feeCup)
  const lista = form.frequency && form.vehicleType && !Number.isNaN(feePreview)
  const previewRoute: RouteDto | null =
    scope === 'provincial'
      ? lista && form.originProvince && form.destProvince
        ? {
            id: editingRouteId ?? 'preview',
            origin: provById.get(form.originProvince) ?? '',
            destination: provById.get(form.destProvince) ?? '',
            originId: null,
            destinationId: null,
            originProvinceId: form.originProvince,
            destinationProvinceId: form.destProvince,
            scope: 'provincial',
            stops: form.stops.trim(),
            frequency: form.frequency,
            daysNote: form.daysNote.trim(),
            serviceType: form.serviceType,
            vehicleType: form.vehicleType,
            feeCup: feePreview,
            status: 'active',
            nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
            notes: form.notes.trim(),
          }
        : null
      : lista && form.originId && form.destId
        ? {
            id: editingRouteId ?? 'preview',
            origin: munById.get(form.originId)?.name ?? '',
            destination: munById.get(form.destId)?.name ?? '',
            originId: form.originId,
            destinationId: form.destId,
            originProvinceId: null,
            destinationProvinceId: null,
            scope: 'municipal',
            stops: form.stops.trim(),
            frequency: form.frequency,
            daysNote: form.daysNote.trim(),
            serviceType: form.serviceType,
            vehicleType: form.vehicleType,
            feeCup: feePreview,
            status: 'active',
            nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
            notes: form.notes.trim(),
          }
        : null

  const munOrigen = provinces.find((p) => p.id === form.originProvince)?.municipalities ?? []
  const munDestino = provinces.find((p) => p.id === form.destProvince)?.municipalities ?? []

  const pasos = [
    { n: 1, label: 'Trayecto' },
    { n: 2, label: 'Servicio' },
    { n: 3, label: 'Detalles' },
  ]

  return (
    <div>
      <TopBar
        title={editando ? 'Editar ruta' : 'Publicar ruta'}
        subtitle="Comparte el trayecto que ofreces"
        onBack={back}
      />

      <div className="px-4 pt-4 pb-8">
        {/* Stepper 1-2-3 */}
        <ol className="mb-4 flex items-center gap-2" aria-label={`Paso ${step} de 3`}>
          {pasos.map((p, i) => {
            const done = p.n < step
            const active = p.n === step
            return (
              <li key={p.n} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold',
                    active && 'bg-blue text-white',
                    done && 'bg-blue/10 text-blue',
                    !active && !done && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span>{p.n}</span>}
                  {p.label}
                </span>
                {i < pasos.length - 1 && (
                  <span className={cn('h-0.5 flex-1 rounded-full', p.n < step ? 'bg-blue/40' : 'bg-line')} aria-hidden />
                )}
              </li>
            )
          })}
        </ol>

        {/* Aviso del formato según el tipo de mensajero */}
        <p
          className={cn(
            'mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold',
            scope === 'provincial'
              ? 'bg-orange/10 text-orange'
              : 'bg-blue/10 text-blue'
          )}
        >
          {scope === 'provincial' ? (
            <Globe className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <RouteIcon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {scope === 'provincial'
            ? 'Ruta provincial: origen y destino por provincias'
            : 'Ruta municipal: origen y destino por municipios'}
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </p>
        )}

        {/* ── Paso 1: origen y destino ─────────────────────────────── */}
        {step === 1 && (
          <section aria-label="Origen y destino" className="space-y-5">
            {scope === 'provincial' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="prov-origen">Provincia de origen</Label>
                  <Select value={form.originProvince} onValueChange={(v) => patch({ originProvince: v, originId: null })}>
                    <SelectTrigger id="prov-origen" className="h-12 rounded-xl" aria-label="Provincia de origen">
                      <SelectValue placeholder="Selecciona provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prov-destino">Provincia de destino</Label>
                  <Select value={form.destProvince} onValueChange={(v) => patch({ destProvince: v, destId: null })}>
                    <SelectTrigger id="prov-destino" className="h-12 rounded-xl" aria-label="Provincia de destino">
                      <SelectValue placeholder="Selecciona provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11.5px] text-muted-foreground">
                    Tu ruta se publica como «provincia → provincia» (p. ej. Villa Clara → La Habana).
                    Los clientes de cualquier municipio de esas provincias te encontrarán.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="prov-origen">Provincia de origen</Label>
                  <Select value={form.originProvince} onValueChange={(v) => patch({ originProvince: v, originId: null })}>
                    <SelectTrigger id="prov-origen" className="h-12 rounded-xl" aria-label="Provincia de origen">
                      <SelectValue placeholder="Selecciona provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mun-origen">Municipio de origen</Label>
                  <Select
                    value={form.originId ?? ''}
                    onValueChange={(v) => patch({ originId: v })}
                    disabled={!form.originProvince}
                  >
                    <SelectTrigger id="mun-origen" className="h-12 rounded-xl" aria-label="Municipio de origen">
                      <SelectValue placeholder={form.originProvince ? 'Selecciona municipio' : 'Elige primero la provincia'} />
                    </SelectTrigger>
                    <SelectContent>
                      {munOrigen.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prov-destino">Provincia de destino</Label>
                  <Select value={form.destProvince} onValueChange={(v) => patch({ destProvince: v, destId: null })}>
                    <SelectTrigger id="prov-destino" className="h-12 rounded-xl" aria-label="Provincia de destino">
                      <SelectValue placeholder="Selecciona provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mun-destino">Municipio de destino</Label>
                  <Select
                    value={form.destId ?? ''}
                    onValueChange={(v) => patch({ destId: v })}
                    disabled={!form.destProvince}
                  >
                    <SelectTrigger id="mun-destino" className="h-12 rounded-xl" aria-label="Municipio de destino">
                      <SelectValue placeholder={form.destProvince ? 'Selecciona municipio' : 'Elige primero la provincia'} />
                    </SelectTrigger>
                    <SelectContent>
                      {munDestino.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="paradas">Paradas intermedias (opcional)</Label>
              <Input
                id="paradas"
                value={form.stops}
                onChange={(e) => patch({ stops: e.target.value })}
                placeholder={scope === 'provincial' ? 'Provincias o municipios intermedios, por comas' : 'Municipios intermedios, separados por comas'}
                maxLength={300}
                className="h-12 rounded-xl"
              />
              <p className="text-[11.5px] text-muted-foreground">
                {scope === 'provincial'
                  ? 'Ej.: «Matanzas, Cienfuegos». Ayuda a encontrar clientes de trayectos parciales.'
                  : 'Ej.: «Colón, Jovellanos». Ayuda a encontrar clientes de trayectos parciales.'}
              </p>
            </div>
          </section>
        )}

        {/* ── Paso 2: frecuencia y servicio ────────────────────────── */}
        {step === 2 && (
          <section aria-label="Frecuencia y servicio" className="space-y-5">
            <div className="space-y-2">
              <Label>Frecuencia del recorrido</Label>
              <Select value={form.frequency ?? ''} onValueChange={(v) => patch({ frequency: v })}>
                <SelectTrigger className="h-12 rounded-xl" aria-label="Frecuencia">
                  <SelectValue placeholder="Selecciona frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS.map((f) => (
                    <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias">Días o nota de frecuencia</Label>
              <Input
                id="dias"
                value={form.daysNote}
                onChange={(e) => patch({ daysNote: e.target.value })}
                placeholder="Lunes a viernes"
                maxLength={120}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de servicio</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de servicio">
                {SERVICIOS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ serviceType: s })}
                    aria-pressed={form.serviceType === s}
                    className={cn(
                      'min-h-[44px] rounded-full border px-4 text-[12.5px] font-semibold transition-all active:scale-95',
                      form.serviceType === s
                        ? 'border-blue bg-blue text-white'
                        : 'border-line bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {SERVICE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select value={form.vehicleType ?? ''} onValueChange={(v) => patch({ vehicleType: v })}>
                <SelectTrigger className="h-12 rounded-xl" aria-label="Vehículo">
                  <SelectValue placeholder="Selecciona vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICULOS.map((v) => (
                    <SelectItem key={v} value={v}>{VEHICLE_LABELS[v]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        )}

        {/* ── Paso 3: tarifa, salida, notas y vista previa ─────────── */}
        {step === 3 && (
          <section aria-label="Tarifa y detalles" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tarifa">Tarifa orientativa en CUP (opcional)</Label>
              <Input
                id="tarifa"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.feeCup}
                onChange={(e) => patch({ feeCup: e.target.value })}
                placeholder="Ej. 200"
                className="h-12 rounded-xl"
              />
              <p className="text-[11.5px] text-muted-foreground">
                Si la dejas vacía, los clientes verán «Tarifa por acordar».
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salida">Próxima salida (opcional)</Label>
              <Input
                id="salida"
                type="datetime-local"
                value={form.nextDepartureAt}
                onChange={(e) => patch({ nextDepartureAt: e.target.value })}
                className="h-12 rounded-xl"
              />
              <p className="text-[11.5px] text-muted-foreground">
                La verán los clientes como tu próximo recorrido.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas para los clientes</Label>
              <Textarea
                id="notas"
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Condiciones, punto de recogida, espacio disponible…"
                maxLength={500}
                className="min-h-24 rounded-xl"
              />
            </div>

            {/* Vista previa */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                <Eye className="h-4 w-4" aria-hidden />
                Vista previa · Así lo verán los clientes
              </p>
              {previewRoute ? (
                <RouteCard route={previewRoute} />
              ) : (
                <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
                  Completa los pasos anteriores para ver la vista previa.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Botonera */}
        <div className="mt-7 flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => {
                setError(null)
                setStep(step - 1)
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Atrás
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" className="h-12 flex-1 rounded-full" onClick={() => irAPaso(step + 1)}>
              Continuar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 flex-1 rounded-full"
              disabled={saveQ.isPending}
              onClick={() => saveQ.mutate()}
            >
              {saveQ.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Guardando…
                </>
              ) : (
                <>
                  {editando ? 'Guardar cambios' : 'Publicar ruta'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          La tarifa y la disponibilidad las publicas tú. El cliente confirma contigo las condiciones finales.
        </p>
      </div>
    </div>
  )
}
