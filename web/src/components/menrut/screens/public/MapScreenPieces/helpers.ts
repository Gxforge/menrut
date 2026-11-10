// MENRUT — MapScreen · helpers puros de rutas.
import type { RouteDto } from '@/lib/types'

export function courierName(route: RouteDto, couriers: Record<string, string>): string | null {
  return route.courierName ?? (route.courierId ? couriers[route.courierId] ?? null : null)
}
