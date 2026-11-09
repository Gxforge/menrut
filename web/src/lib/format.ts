// MENRUT — Utilidades de formato
export function formatCup(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n.toLocaleString('es-CU')} CUP`
}

export function formatRating(r: number | null | undefined): string {
  if (r === null || r === undefined) return '—'
  return r.toFixed(1)
}

export function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h} h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return d.toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CU', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' })
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export const SERVICE_LABELS: Record<string, string> = {
  paquetes: 'Paquetes',
  encargos: 'Encargos',
  entregas_comerciales: 'Entregas comerciales',
  otros: 'Otros',
}

export const VEHICLE_LABELS: Record<string, string> = {
  motor: 'Motor',
  auto: 'Auto',
  panel: 'Panel',
  camion: 'Camión',
  bicielectrica: 'Bici eléctrica',
}

export const FREQ_LABELS: Record<string, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  personalizada: 'Personalizada',
  programada: 'Programada',
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  paused: 'Pausada',
  closed: 'Cerrada',
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
