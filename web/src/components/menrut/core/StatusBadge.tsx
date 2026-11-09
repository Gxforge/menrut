// MENRUT — Insignias de estado y etiquetas explicables
import { ShieldCheck, Clock3, BadgeCheck, MapPin, Route as RouteIcon, Sparkles, CalendarClock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageType } from '@/lib/types'

// Sello de verificación (azul, con texto — no solo un check)
export function VerifiedSeal({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-blue/10 text-blue font-semibold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className
      )}
      title="Identidad verificada por MENRUT"
    >
      <ShieldCheck className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {compact ? 'Verificado' : 'Identidad verificada'}
    </span>
  )
}

export function PendingSeal({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full bg-orange/10 text-orange font-semibold px-2.5 py-1 text-[11px]', className)}
      title="Verificación en revisión"
    >
      <Clock3 className="h-3.5 w-3.5" aria-hidden />
      En revisión
    </span>
  )
}

// Estado de ruta
export function RouteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Activa', cls: 'bg-success/10 text-success' },
    scheduled: { label: 'Programada', cls: 'bg-orange/10 text-orange' },
    paused: { label: 'Pausada', cls: 'bg-muted text-muted-foreground' },
    closed: { label: 'Cerrada', cls: 'bg-muted text-muted-foreground' },
  }
  const v = map[status] ?? map.paused
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', v.cls)}>
      {v.label}
    </span>
  )
}

// Etiquetas de coincidencia (por qué aparece el mensajero — datos reales, no scores)
export function MatchTag({ reason }: { reason: string }) {
  const normalized = reason.toLowerCase()
  let cls = 'bg-blue/10 text-navy'
  let icon = <BadgeCheck className="h-3 w-3" aria-hidden />
  if (normalized.includes('parcial')) {
    cls = 'bg-orange/10 text-orange'
    icon = <MapPin className="h-3 w-3" aria-hidden />
  } else if (normalized.includes('frecuente')) {
    cls = 'bg-blue/10 text-blue'
    icon = <RouteIcon className="h-3 w-3" aria-hidden />
  } else if (normalized.includes('próximo') || normalized.includes('proximo')) {
    cls = 'bg-cyan/10 text-cyan'
    icon = <CalendarClock className="h-3 w-3" aria-hidden />
  } else if (normalized.includes('cobertura')) {
    cls = 'bg-muted text-muted-foreground'
    icon = <MapPin className="h-3 w-3" aria-hidden />
  } else if (normalized.includes('destacado')) {
    cls = 'bg-orange/10 text-orange'
    icon = <Sparkles className="h-3 w-3" aria-hidden />
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', cls)}>
      {icon}
      {reason}
    </span>
  )
}

// Tag genérica (BÁSICO/PRO/DESTACADO/CRÉDITOS/GRATUITA/BLOQUEADA)
export function ToolTag({ tag, blocked = false }: { tag: string; blocked?: boolean }) {
  const map: Record<string, string> = {
    'BÁSICO': 'bg-blue/10 text-blue',
    'PRO': 'bg-navy/10 text-navy',
    'DESTACADO': 'bg-orange/10 text-orange',
    'CRÉDITOS': 'bg-cyan/10 text-cyan',
    'GRATUITA': 'bg-success/10 text-success',
    'BLOQUEADA': 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide', blocked ? 'bg-muted text-muted-foreground' : (map[tag] ?? 'bg-blue/10 text-blue'))}>
      {tag}
    </span>
  )
}

// ─── Tipo de mensajero (corrección del propietario) ─────────────────────────
// zona trabaja dentro de su municipio base · municipal viaja entre municipios
// provincial cubre rutas de provincia a provincia. Nunca se fuerza un tipo.

export const COVERAGE_LABELS: Record<CoverageType, string> = {
  zone: 'Zona',
  municipal: 'Municipal',
  provincial: 'Provincial',
}

export const COVERAGE_HINTS: Record<CoverageType, string> = {
  zone: 'Trabaja dentro de su municipio base',
  municipal: 'Viaja de municipio a municipio',
  provincial: 'Cubre rutas de provincia a provincia',
}

// Chip pequeño con icono+texto según el tipo. `className` permite variantes
// (p. ej. fondo translúcido sobre la cabecera navy del pasaporte).
export function CoverageBadge({ type, className }: { type: CoverageType; className?: string }) {
  const meta: Record<CoverageType, { icon: React.ReactNode; cls: string }> = {
    zone: { icon: <MapPin className="h-3.5 w-3.5" aria-hidden />, cls: 'bg-cyan/10 text-cyan' },
    municipal: { icon: <RouteIcon className="h-3.5 w-3.5" aria-hidden />, cls: 'bg-blue/10 text-blue' },
    provincial: { icon: <Globe className="h-3.5 w-3.5" aria-hidden />, cls: 'bg-orange/10 text-orange' },
  }
  const m = meta[type] ?? meta.municipal
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        m.cls,
        className,
      )}
      title={COVERAGE_HINTS[type]}
    >
      {m.icon}
      {COVERAGE_LABELS[type]}
    </span>
  )
}
