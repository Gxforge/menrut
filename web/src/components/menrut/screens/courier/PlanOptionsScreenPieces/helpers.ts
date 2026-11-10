// MENRUT — PlanOptionsScreen · Tipos, niveles y helpers de la matriz comercial.
import { Crown, ShieldCheck, Zap } from 'lucide-react'
import type { PlanDto } from '@/lib/types'

// Niveles comerciales (la prueba gratuita queda fuera de la matriz de compra)
export type TierId = 'basic' | 'pro' | 'featured'

export const TIERS: { id: TierId; label: string; icon: typeof Crown }[] = [
  { id: 'basic', label: 'Básico', icon: ShieldCheck },
  { id: 'pro', label: 'Profesional', icon: Zap },
  { id: 'featured', label: 'Destacado', icon: Crown },
]

// Meses equivalentes de cada duración (30 → 1, 90 → 3, 180 → 6, 365 → 12)
export function monthsOf(p: PlanDto): number {
  return Math.max(1, Math.round(p.durationDays / 30))
}
