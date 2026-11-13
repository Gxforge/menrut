// MENRUT — Tipos compartidos (contrato entre pantallas y API)
// Dominio común: sesión, territorios, búsqueda, pasaporte, guardados,
// mensajes y notificaciones.

export type Role = 'client' | 'courier' | 'business' | 'admin' | 'owner' | 'moderator'

// Tipo de mensajero (corrección del propietario): zona trabaja dentro de su
// municipio base; municipal viaja entre municipios; provincial entre provincias.
export type CoverageType = 'zone' | 'municipal' | 'provincial'

export type ScreenId =
  // Pública / cliente
  | 'splash' | 'welcome' | 'login' | 'register' | 'recovery' | 'complete-profile'
  | 'home' | 'filters' | 'results' | 'passport' | 'map' | 'saved'
  | 'inbox' | 'chat' | 'notifications' | 'client-profile' | 'business-profile'
  | 'privacy'
  // Mensajero
  | 'courier-home' | 'courier-routes' | 'route-form' | 'reputation'
  | 'membership' | 'plan-options' | 'tools' | 'settings'
  | 'courier-deliveries'
  // Administración
  | 'admin-home' | 'admin-couriers' | 'admin-businesses' | 'admin-payments'
  | 'admin-tools' | 'admin-moderation' | 'admin-settings' | 'admin-system'
  | 'admin-databases'

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
  isHighlighted?: boolean // herramienta «destacar» activa
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
  /** Opinión propia del visitante (si la hay): se edita en vez de crear otra. */
  myReview?: ReviewDto | null
  isDemo: boolean
}

// ─── Entregas verificadas por OTP ─────────────────────────────────────────

export interface DeliveryDto {
  id: string
  courierId: string
  clientId: string
  clientName?: string | null
  expiresAt: string
  confirmedAt: string | null
  status: 'pending' | 'verified' | 'expired'
}

export interface CreatedDeliveryDto {
  delivery: { id: string; courierId: string; expiresAt: number; status: string }
  code: string
  expiresInSec: number
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

// Eventos del chat (v2.2): código de entrega y encargo. Los mensajes de texto no llevan kind.
export interface DeliveryCodePayload {
  deliveryId: string
  code: string
  expiresAt: number // ms
  status: 'pending' | 'client_confirmed' | 'confirmed' | 'cancelled' | 'expired'
}

export interface EncargoPayload {
  description: string
}

export interface MessageDto {
  id: string
  conversationId: string
  senderId: string
  mine: boolean
  body: string
  readAt: string | null
  createdAt: string
  kind?: 'text' | 'delivery_code' | 'encargo'
  refId?: string | null
  payload?: DeliveryCodePayload | EncargoPayload | null
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
