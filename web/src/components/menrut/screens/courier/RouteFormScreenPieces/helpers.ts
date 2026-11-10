// MENRUT — RouteFormScreen · Tipos, constantes y helpers puros del formulario
// de rutas (extraídos de la pantalla para mantenerla compacta).
import type { MunicipalityDto, ProvinceDto, RouteDto } from '@/lib/types'

export type ServicioTipo = 'paquetes' | 'encargos' | 'entregas_comerciales' | 'otros'
export type Scope = 'municipal' | 'provincial'

export interface FormState {
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

export const INITIAL: FormState = {
  originProvince: '', originId: null, destProvince: '', destId: null,
  stops: '', frequency: null, daysNote: '', serviceType: 'paquetes',
  vehicleType: null, feeCup: '', nextDepartureAt: '', notes: '',
}

export const SERVICIOS: ServicioTipo[] = ['paquetes', 'encargos', 'entregas_comerciales', 'otros']
export const FRECUENCIAS = ['diaria', 'semanal', 'programada', 'personalizada'] as const
export const VEHICULOS = ['motor', 'auto', 'panel', 'camion', 'bicielectrica'] as const

// ISO → valor válido para <input type="datetime-local"> en hora local
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function parseFee(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return NaN // señal de error
  return Math.round(n)
}

// Estado inicial del formulario: vacío (crear) o precargado (editar).
// El trayecto se lee según el scope de la ruta.
export function desdeRuta(route: RouteDto | null, provinces: ProvinceDto[]): FormState {
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

// Municipios de una provincia concreta (para los selects dependientes).
export function municipiosDe(provinces: ProvinceDto[], provinceId: string): MunicipalityDto[] {
  return provinces.find((p) => p.id === provinceId)?.municipalities ?? []
}
