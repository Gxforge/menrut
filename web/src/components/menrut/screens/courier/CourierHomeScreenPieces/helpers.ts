// MENRUT — CourierHomeScreen · Helpers y tipos de los accesos rápidos.
import type { ScreenId } from '@/lib/types'

// Saludo según la hora del dispositivo
export function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export interface Acceso {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  screen: ScreenId
  onBefore?: () => void
}
