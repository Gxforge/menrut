// MENRUT — CompleteProfileScreen · constantes y tipos puros de la ficha.
import type { ComponentType } from 'react'
import { Globe, MapPin, Route as RouteIcon } from 'lucide-react'
import type { api } from '@/lib/api'
import type { CoverageType } from '@/lib/types'

export const SERVICE_KEYS = ['paquetes', 'encargos', 'entregas_comerciales', 'otros'] as const
export type ServiceKey = (typeof SERVICE_KEYS)[number]

// ─── ¿Cómo trabajas? · opciones de tipo (corrección del propietario) ─────────
// zona: dentro de su municipio base · municipal: municipio a municipio
// provincial: provincia a provincia. La ficha nunca presupone un tipo.
export const TIPO_OPCIONES: {
  value: CoverageType
  icon: ComponentType<{ className?: string }>
  title: string
  desc: string
  ejemplo: string
}[] = [
  {
    value: 'zone',
    icon: MapPin,
    title: 'En mi zona',
    desc: 'Trabajo dentro de mi municipio',
    ejemplo: 'Ej.: Santa Clara, dentro del propio municipio',
  },
  {
    value: 'municipal',
    icon: RouteIcon,
    title: 'Entre municipios',
    desc: 'Viajo de municipio a municipio',
    ejemplo: 'Ej.: Camajuaní → Santa Clara',
  },
  {
    value: 'provincial',
    icon: Globe,
    title: 'Entre provincias',
    desc: 'Cubro rutas de provincia a provincia',
    ejemplo: 'Ej.: Villa Clara → La Habana',
  },
]

// PATCH /api/courier/me acepta además `coverageType` (contrato T8-a). El tipo
// público de api.updateCourierProfile aún no lo incluye, así que el campo extra
// se declara aquí y viaja en el mismo JSON del PATCH.
export type CourierProfilePatch = Parameters<typeof api.updateCourierProfile>[0] & {
  coverageType?: CoverageType
}
