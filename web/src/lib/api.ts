// MENRUT — Contrato de API (cliente tipado)
// Todas las llamadas usan rutas relativas y adjuntan el JWT de Supabase.
import { getAccessToken } from './auth'
import { API_BASE } from './api-base'
import type {
  ProvinceDto, CourierSearchItem, PassportDto, ConversationDto, MessageDto,
  NotificationDto, PlanDto, ToolDto, SavedRouteDto, WalletDto,
  CourierDashboardDto, RouteDto, ReviewDto, AdminOverviewDto, AdminCourierDto,
  AdminPaymentDto, AdminAccountDto, AuditLogDto, ReportFlagDto, SystemStatusDto,
  SessionUser, PaymentProofDto, RequestPlanResponseDto, DecidePaymentPayload,
  DatabasesStatusDto,
} from './types'

// Tiempo máximo de espera por petición: ninguna pantalla puede quedarse
// «cargando» para siempre si la red se cae a mitad de solicitud.
const REQUEST_TIMEOUT_MS = 20_000

// Exportada para api-more.ts (nuevos dominios: entregas OTP, herramientas,
// respuestas a reseñas y borrado de cuenta) sin superar el límite de líneas.
export async function req<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers)
  // La API v2 de producción exige Content-Type: application/json en TODOS los
  // POST/PATCH/PUT (aunque vayan sin cuerpo, p. ej. marcar notificación leída);
  // responde 415 en caso contrario. Tolerá un cuerpo vacío/sin parsear.
  const method = (init?.method ?? 'GET').toUpperCase()
  if (init?.body || ['POST', 'PATCH', 'PUT'].includes(method)) {
    headers.set('Content-Type', 'application/json')
  }
  if (init?.auth !== false) {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // 401 en una ruta con sesión: la cuenta ya no es válida. Se cierra la sesión local
    // para volver a la pantalla de entrada en lugar de dejar pantallas con errores.
    if (res.status === 401 && init?.auth !== false) {
      const { endLocalSession } = await import('@/lib/supabase')
      void endLocalSession()
      throw new Error('Tu sesión caducó. Vuelve a entrar.')
    }
    throw new Error(body.error || `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Público ────────────────────────────────────────────────────────────────

export interface LaunchPromoDto {
  discount: { percent: number; active: boolean; endsAt: string }
  municipality: { id: string; name: string } | null
  cupos: { total: number; remaining: number } | null
  claim: { municipalityId: string; months: number; granted: boolean; claimedAt: number } | null
}

export const api = {
  // Territorios (caché local de 24h; catálogo estable)
  territories: () =>
    req<{ provinces: ProvinceDto[] }>('/territories', { auth: false }),

  // Búsqueda de mensajeros por ruta
  search: (params: URLSearchParams) =>
    req<{ results: CourierSearchItem[]; alternatives: string[] }>(`/search?${params.toString()}`, { auth: false }),

  // Pasaporte completo del mensajero
  passport: (courierId: string) =>
    req<PassportDto>(`/couriers/${courierId}`, { auth: false }),

  // Planes y herramientas (públicos)
  plans: () => req<{ plans: PlanDto[] }>('/plans', { auth: false }),
  tools: () => req<{ tools: ToolDto[] }>('/tools', { auth: false }),

  // Rutas populares (activas, sin sesión)
  popularRoutes: () =>
    req<{ routes: RouteDto[]; couriers: Record<string, string> }>('/routes/popular', { auth: false }),

  // ─── Promoción de lanzamiento (cupos por municipio + 20 % temporal) ───
  launchPromo: () => req<LaunchPromoDto>('/courier/me/launch-promo'),
  claimLaunchPromo: () => req<{ ok: true; months: number; seq?: number; expiresAt: number | null }>('/courier/me/launch-promo/claim', { method: 'POST', body: '{}' }),
  setBaseMunicipality: (data: { provinceId: string; municipalityId: string }) =>
    req<{ ok: true; municipalityId: string }>('/courier/me/base-municipality', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Perfil propio ────────────────────────────────────────────────────────
  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    req<{ user: SessionUser }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ─── Sesión ───────────────────────────────────────────────────────────────
  report: (targetType: string, targetId: string, reason: string) =>
    req<{ ok: true }>('/reports', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, reason }),
    }),

  // ─── Favoritos y guardados ────────────────────────────────────────────────
  favorites: () =>
    req<{ couriers: CourierSearchItem[] }>('/favorites'),
  toggleFavorite: (courierId: string) =>
    req<{ favorite: boolean }>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ courierId }),
    }),

  // Valorar/comentar a un mensajero (requiere sesión). Una opinión por usuario:
  // si ya existe, se sustituye (updated=true). Si se pasa deliveryId de una
  // entrega verificada por OTP, la opinión queda marcada «verificada».
  submitReview: (courierId: string, rating: number, comment: string, deliveryId?: string) =>
    req<{ review: ReviewDto; updated: boolean; ratingAvg: number; ratingCount: number }>(`/couriers/${courierId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, ...(deliveryId ? { deliveryId } : {}) }),
    }),

  savedRoutes: () => req<{ routes: SavedRouteDto[] }>('/saved-routes'),
  addSavedRoute: (originId: string, destinationId: string, label: string, alertsEnabled: boolean) =>
    req<{ route: SavedRouteDto }>('/saved-routes', {
      method: 'POST',
      body: JSON.stringify({ originId, destinationId, label, alertsEnabled }),
    }),
  deleteSavedRoute: (id: string) =>
    req<{ ok: true }>(`/saved-routes/${id}`, { method: 'DELETE' }),

  // ─── Mensajes ─────────────────────────────────────────────────────────────
  conversations: () => req<{ conversations: ConversationDto[] }>('/conversations'),
  startConversation: (courierUserId: string) =>
    req<{ conversation: ConversationDto }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ courierUserId }),
    }),
  // Últimos mensajes; «before» (rowid del más antiguo cargado) pide la página anterior.
  messages: (conversationId: string, before?: number | null) =>
    req<{ messages: MessageDto[]; hasMore?: boolean; nextBefore?: number | null }>(
      `/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`,
    ),
  requestDeliveryCode: (conversationId: string) =>
    req<{ message: MessageDto; reused: boolean }>(`/conversations/${conversationId}/delivery-code`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  clientConfirmReceipt: (conversationId: string, deliveryId: string) =>
    req<{ ok: true }>(`/conversations/${conversationId}/delivery-code/client-confirm`, {
      method: 'POST',
      body: JSON.stringify({ deliveryId }),
    }),
  cancelDeliveryCode: (conversationId: string, deliveryId: string) =>
    req<{ ok: true }>(`/conversations/${conversationId}/delivery-code/cancel`, {
      method: 'POST',
      body: JSON.stringify({ deliveryId }),
    }),
  verifyDeliveryCode: (conversationId: string, deliveryId: string, code: string) =>
    req<{ ok: true; verifiedDeliveries: number }>(`/conversations/${conversationId}/delivery-code/confirm`, {
      method: 'POST',
      body: JSON.stringify({ deliveryId, code }),
    }),
  createEncargo: (conversationId: string, description: string) =>
    req<{ message: MessageDto; hired: true }>(`/conversations/${conversationId}/encargos`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    }),
  sendMessage: (conversationId: string, body: string) =>
    req<{ message: MessageDto }>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  // ─── Notificaciones ───────────────────────────────────────────────────────
  notifications: () => req<{ notifications: NotificationDto[] }>('/notifications'),
  markNotificationRead: (id: string) =>
    req<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST' }),

  // ─── Mensajero ────────────────────────────────────────────────────────────
  courierDashboard: () => req<CourierDashboardDto>('/courier/me'),
  updateCourierProfile: (data: {
    bio?: string
    yearsExperience?: number
    vehicleSummary?: string
    availabilityNote?: string
    baseFeeCup?: number | null
    contactPreference?: string
    services?: string[]
  }) =>
    req<{ ok: true }>('/courier/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  courierRoutes: () => req<{ routes: RouteDto[] }>('/courier/me/routes'),
  createRoute: (data: Record<string, unknown>) =>
    req<{ route: RouteDto }>('/courier/me/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoute: (id: string, data: Record<string, unknown>) =>
    req<{ route: RouteDto }>(`/courier/me/routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteRoute: (id: string) =>
    req<{ ok: true }>(`/courier/me/routes/${id}`, { method: 'DELETE' }),
  courierReviews: () =>
    req<{ reviews: ReviewDto[]; distribution: Record<string, number> }>('/courier/me/reviews'),
  courierWallet: () => req<WalletDto>('/courier/me/wallet'),
  requestMembership: (planCode: string, payment: { amountCup: number; method: string; reference: string; proofUrl?: string }) =>
    req<{ ok: true; status: string }>('/courier/me/membership', {
      method: 'POST',
      body: JSON.stringify({ planCode, ...payment }),
    }),
  submitVerification: (data: { documentUrl?: string; note: string }) =>
    req<{ ok: true }>('/courier/me/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Pagos (Transfermóvil) ───────────────────────────────────────────────
  // El mensajero elige plan → recibe instrucciones → paga → sube captura →
  // el propietario/admin coteja y decide (approve/reject).
  requestPlan: (planId: string) =>
    req<RequestPlanResponseDto>('/payments/request', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  // Subida de la captura (multipart/form-data; el JWT va en el header).
  cancelPaymentRequest: (proofId: string) =>
    req<{ ok: true }>(`/payments/${proofId}/cancel`, { method: 'POST' }),

  uploadPaymentProof: async (proofId: string, file: File): Promise<{ proof: PaymentProofDto }> => {
    const token = await getAccessToken()
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/payments/${proofId}/proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: AbortSignal.timeout(60_000), // subir una captura puede tardar más
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Error ${res.status}`)
    }
    return res.json() as Promise<{ proof: PaymentProofDto }>
  },

  getMyPayments: () =>
    req<{ payments: PaymentProofDto[] }>('/payments/mine'),

  // ─── Administración ───────────────────────────────────────────────────────
  adminOverview: () => req<AdminOverviewDto>('/admin/overview'),
  adminCouriers: (status?: string) =>
    req<{ couriers: AdminCourierDto[] }>(`/admin/couriers${status ? `?status=${status}` : ''}`),
  adminReviewVerification: (courierId: string, decision: 'verified' | 'rejected', note: string) =>
    req<{ ok: true }>(`/admin/couriers/${courierId}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),
  adminAccounts: () => req<{ accounts: AdminAccountDto[] }>('/admin/accounts'),
  adminPayments: (status?: string) =>
    req<{ payments: AdminPaymentDto[] }>(`/admin/payments${status ? `?status=${status}` : ''}`),
  // Variante del contrato T8: mismo endpoint, nombre explícito para la UI.
  getAdminPayments: (status?: 'pending' | 'approved' | 'rejected' | 'all') =>
    req<{ payments: AdminPaymentDto[] }>(`/admin/payments${status ? `?status=${status}` : ''}`),
  // Decisión del propietario/admin sobre una solicitud de pago (Transfermóvil).
  decidePayment: (id: string, payload: DecidePaymentPayload) =>
    req<{ ok: true; status: string; expiresAt?: string }>(`/admin/payments/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminReviewPayment: (id: string, decision: 'approved' | 'rejected', note: string) =>
    req<{ ok: true }>(`/admin/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),
  adminSavePlan: (plan: Partial<PlanDto> & { code: string }) =>
    req<{ plan: PlanDto }>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    }),
  adminSaveTool: (tool: Partial<ToolDto> & { code: string }) =>
    req<{ tool: ToolDto }>('/admin/tools', {
      method: 'POST',
      body: JSON.stringify(tool),
    }),
  adminModeration: () =>
    req<{ reports: ReportFlagDto[]; audit: AuditLogDto[] }>('/admin/moderation'),
  adminResolveReport: (id: string, status: 'reviewed' | 'dismissed') =>
    req<{ ok: true }>(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  adminSystem: () => req<SystemStatusDto>('/admin/system'),
  adminDatabases: () => req<DatabasesStatusDto>('/admin/databases'),
  adminConfig: () =>
    req<{ config: Record<string, string> }>('/admin/config'),
  adminSaveConfig: (config: Record<string, string>) =>
    req<{ ok: true }>('/admin/config', {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),
}
