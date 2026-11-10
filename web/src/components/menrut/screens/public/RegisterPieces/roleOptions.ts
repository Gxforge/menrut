// MENRUT — Piezas de RegisterScreen: tipos de cuenta disponibles y validación
// básica del correo (compartidos entre la pantalla y sus piezas).
import { Bike, Store, UserRound } from 'lucide-react'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignupRole = 'courier' | 'client' | 'business'

export const ROLE_OPTIONS: {
  value: SignupRole
  label: string
  tagline: string
  perks: string
  icon: typeof Bike
}[] = [
  {
    value: 'courier',
    label: 'Mensajero',
    tagline: 'Ofrezco mi ruta y servicios',
    perks: 'Publica rutas, tu pasaporte y cobra encargos',
    icon: Bike,
  },
  {
    value: 'client',
    label: 'Usuario',
    tagline: 'Busco y contacto mensajeros',
    perks: 'Guarda favoritos, opina, puntúa y chatea',
    icon: UserRound,
  },
  {
    value: 'business',
    label: 'Negocio',
    tagline: 'Contrato entregas para mi negocio',
    perks: 'Contacta mensajeros para mercancía y encargos',
    icon: Store,
  },
]
