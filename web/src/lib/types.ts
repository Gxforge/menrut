// MENRUT — Tipos compartidos (contrato entre pantallas y API)

export type Role = 'client' | 'courier' | 'business' | 'admin' | 'owner' | 'moderator'

// Tipo de mensajero (corrección del propietario): zona trabaja dentro de su
// municipio base; municipal viaja entre municipios; provincial entre provincias.
export type CoverageType = 'zone' | 'municipal' | 'provincial'

export type ScreenId =
  // Pública / cliente
  | 'splash' | 'welcome' | 'login' | 'register' | 'recovery' | 'complete-profile'
  | 'home' | 'filters' | 'results' | 'passport' | 'map' | 'saved'
  | 'inbox' | 'chat' | 'notifications' | 'client-profile' | 'business-profile'
  // Mensajero
  | 'courier-home' | 'courier-routes' | 'route-form' | 'reputation'
  | 'membership' | 'plan-options' | 'tools' | 'settings'
  // Administración
  | 'admin-home' | 'admin-couriers' | 'admin-businesses' | 'admin-payments'
  | 'admin-tools' | 'admin-moderation' | 'admin-settings' | 'admin-system'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
  avatarUrl?: string | null
  phone?: string | null
}

// ─── Territorios ────────────────────────────────────────────────────────────

export interface MunicipalityDto {
  id: string
  name: string
}

export interface ProvinceDto {
  id: string
  name: string
  municipalities: MunicipalityDto[]
}

// ─── Búsqueda y pasaporte ───────────────────────────────────────────────────

export interface SearchFilters {
  originId: string | null
  destinationId: string | null
  routeMode: 'any' | 'full' | 'partial'
  serviceType: 'any' | 'paquetes' | 'encargos' | 'entregas_comerciales' | 'otros'
  vehicle: 'any' | 'motor' | 'auto' | 'panel' | 'camion' | 'bicielectrica'
  minRating: number | null
  maxFee: number | null
  onlyVerified: boolean
  sort: 'relevance' | 'rating' | 'availability'
}

export interface CourierSearchItem {
  courierId: string
  userId: string
  fullName: string
  avatarUrl: string | null
  isVerified: boolean
  isFavorite: boolean
  ratingAvg: number
  ratingCount: number
  verifiedDeliveries: number
  vehicleSummary: string
  availabilityNote: string
  feeCup: number | null
  isDemo: boolean
  coverageType: CoverageType
  matchReasons: string[] // p. ej. "Cubre tu ruta", "Ruta frecuente", "Cobertura en tu municipio"
  coverage: string[] // nombres de municipios
  nextDepartureAt: string | null
}

export interface RouteDto {
  id: string
  origin: string
  destination: string
  originId: string | null
  destinationId: string | null
  originProvinceId: string | null
  destinationProvinceId: string | null
  scope: 'municipal' | 'provincial'
  stops: string
  frequency: string
  daysNote: string
  serviceType: string
  vehicleType: string
  feeCup: number | null
  status: string
  nextDepartureAt: string | null
  notes: string
  courierName?: string
  courierId?: string
}

export interface ReviewDto {
  id: string
  authorName: string
  rating: number
  comment: string
  isVerified: boolean
  response: string | null
  createdAt: string
}

export interface PassportDto {
  courierId: string
  userId: string
  fullName: string
  avatarUrl: string | null
  isVerified: boolean
  verificationStatus: string
  ratingAvg: number
  ratingCount: number
  verifiedDeliveries: number
  bio: string
  yearsExperience: number
  vehicleSummary: string
  availabilityNote: string
  feeCup: number | null
  contactPreference: string
  coverageType: CoverageType
  services: string[]
  coverage: string[]
  routes: RouteDto[]
  reviews: ReviewDto[]
  isDemo: boolean
}

// ─── Favoritos y guardados ──────────────────────────────────────────────────

export interface SavedRouteDto {
  id: string
  originId: string
  destinationId: string
  origin: string
  destination: string
  label: string
  alertsEnabled: boolean
  createdAt: string
}

// ─── Mensajes ───────────────────────────────────────────────────────────────

export interface ConversationDto {
  id: string
  otherId: string
  otherName: string
  otherAvatar: string | null
  otherRole: Role
  lastMessage: string
  lastMessageAt: string
  unread: number
}

export interface MessageDto {
  id: string
  conversationId: string
  senderId: string
  mine: boolean
  body: string
  readAt: string | null
  createdAt: string
}

// ─── Notificaciones ─────────────────────────────────────────────────────────

export interface NotificationDto {
  id: string
  category: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

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

// ─── Administración ─────────────────────────────────────────────────────────

export interface AdminOverviewDto {
  couriers: { total: number; verified: number; pending: number; hidden: number }
  clients: { total: number }
  routes: { active: number; scheduled: number }
  payments: { pending: number; approvedThisMonth: number }
  reports: { open: number }
  demoCouriers: number
}

export interface AdminCourierDto {
  courierId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  verificationStatus: string
  isPublic: boolean
  ratingAvg: number
  ratingCount: number
  routesCount: number
  planName: string | null
  planExpiresAt: string | null
  permanenceCredits: number
  createdAt: string
  isDemo: boolean
}

// ─── Pagos (Transfermóvil) ─────────────────────────────────────────────────

export interface PaymentProofDto {
  id: string
  planId: string | null
  planName: string | null
  planCode: string | null
  amountCup: number
  confirmedAmountCup: number | null
  method: string
  reference: string
  proofUrl: string // ruta interna del comprobante (bucket privado)
  hasProof: boolean
  status: 'pending' | 'approved' | 'rejected'
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

// Instrucciones de pago leídas de PlatformConfig (nunca hardcodeadas).
export interface PaymentInstructionsDto {
  method: string
  card: string
  phone: string
  note: string
  amountCup: number
  planName: string
}

export interface RequestPlanResponseDto {
  proof: PaymentProofDto
  instructions: PaymentInstructionsDto
}

export interface DecidePaymentPayload {
  action: 'approve' | 'reject'
  confirmedAmountCup?: number
  reviewNote?: string
}

export interface AdminPaymentDto {
  id: string
  courierName: string
  courierEmail: string
  courierId: string
  planName: string | null
  planCode: string | null
  amountCup: number
  confirmedAmountCup: number | null
  method: string
  reference: string
  proofUrl: string
  proofSignedUrl: string | null // URL firmada (10 min) del comprobante
  hasProof: boolean
  status: string
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface AdminAccountDto {
  id: string
  fullName: string
  email: string
  role: Role
  status: string
  createdAt: string
  reportsCount: number
}

export interface AuditLogDto {
  id: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  detail: string
  createdAt: string
}

export interface ReportFlagDto {
  id: string
  reporterName: string
  targetType: string
  targetId: string
  reason: string
  status: string
  createdAt: string
}

export interface SystemStatusDto {
  databaseOk: boolean
  territories: number
  couriers: number
  users: number
  routes: number
  conversations: number
  notifications: number
  auditEvents: number
  demoShare: number
}
