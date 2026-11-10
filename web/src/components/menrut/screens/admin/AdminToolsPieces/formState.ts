// MENRUT — Piezas de AdminToolsScreen: estado de los formularios de edición
// de planes y herramientas (compartido entre la pantalla y los diálogos).

export interface PlanFormState {
  name: string
  description: string
  durationDays: string
  priceCup: string
  permanenceCredits: string
  toolCredits: string
  isActive: boolean
}

export interface ToolFormState {
  name: string
  description: string
  tag: string
  minPlanCode: string | null
  creditCost: string
  requiresActiveMembership: boolean
  isActive: boolean
  blockedMessage: string
}

export const isNonNegative = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n >= 0
}
