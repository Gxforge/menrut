// MENRUT — Tipos del dominio mensajero: membresías, créditos, herramientas
// y dashboard propio.

import type { CoverageType } from './types-shared'

// ─── Membresías y créditos ──────────────────────────────────────────────────

export type PlanTier = 'trial' | 'basic' | 'pro' | 'featured'

export interface PlanDto {
  id: string
  code: string
  name: string
  description: string
  tier: PlanTier // calculado del código: basic-* | pro-* | featured-* | prueba
  durationDays: number
  priceCup: number
  /** Presente solo mientras dura la promo de lanzamiento (20 %). */
  discountPercent?: number
  discountedPriceCup?: number
  permanenceCredits: number
  toolCredits: number
  isTrial: boolean
  isProposal: boolean
  isActive: boolean
  sortOrder: number
}

export interface ToolDto {
  id: string
  code: string
  name: string
  description: string
  tag: string
  minPlanCode: string | null
  creditCost: number
  requiresActiveMembership: boolean
  isActive: boolean
  blockedMessage: string
  sortOrder: number
}

// Herramienta con elegibilidad calculada por el servidor (GET /courier/me/tools).
export interface ToolWithEligibilityDto extends ToolDto {
  eligible: boolean
  blockedReason: string | null
}

// Reserva de herramienta: reserve → confirm | release (vencimiento libera solo).
export interface ToolReservationDto {
  id: string
  toolId: string
  toolCode: string
  creditCost: number
  status: 'reserved' | 'confirmed' | 'released' | 'expired'
  note: string
  createdAt: string
  expiresAt: string
  confirmedAt: string | null
  releasedAt: string | null
}

export interface CourierToolsDto {
  tools: ToolWithEligibilityDto[]
  reservations: ToolReservationDto[]
  toolCredits: number
  highlightedUntil: number | null
  autoReleased: number
}

export interface WalletDto {
  permanenceCredits: number
  toolCredits: number
  permanenceDaysLeft: number // estimación con base en 10 créditos/día
  hasActiveMembership: boolean
  planName: string | null
  planExpiresAt: string | null
  isPublic: boolean
  transactions: WalletTransactionDto[]
}

export interface WalletTransactionDto {
  id: string
  walletType: 'permanence' | 'tools'
  reason: string
  reference: string | null
  delta: number
  balanceAfter: number
  createdAt: string
}

// ─── Dashboard mensajero ────────────────────────────────────────────────────

export interface CourierDashboardDto {
  isPublic: boolean
  verificationStatus: string
  coverageType: CoverageType
  ratingAvg: number
  ratingCount: number
  verifiedDeliveries: number
  activeRoutes: number
  scheduledRoutes: number
  pausedRoutes: number
  wallet: {
    permanenceCredits: number
    toolCredits: number
    hasActiveMembership: boolean
    planName: string | null
    planExpiresAt: string | null
  }
  courierId: string
  hasUsedTrial: boolean
}
