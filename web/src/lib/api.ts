// MENRUT — Contrato de API (cliente tipado)
// Todas las llamadas usan rutas relativas y adjuntan el JWT de Supabase.
import { getAccessToken } from './auth'
import type {
  ProvinceDto, CourierSearchItem, PassportDto, ConversationDto, MessageDto,
  NotificationDto, PlanDto, ToolDto, SavedRouteDto, WalletDto,
  CourierDashboardDto, RouteDto, ReviewDto, AdminOverviewDto, AdminCourierDto,
  AdminPaymentDto, AdminAccountDto, AuditLogDto, ReportFlagDto, SystemStatusDto,
  SessionUser, PaymentProofDto, RequestPlanResponseDto, DecidePaymentPayload,
} from './types'

async function req<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body) headers.set('Content-Type', 'application/json')
  if (init?.auth !== false) {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Público ────────────────────────────────────────────────────────────────

export const api = {
  // Territorios (caché local de 24h; catálogo estable)
  territories: () =>
    req<{ provinces: ProvinceDto[] }>('/api/v2/territories', { auth: false }),

  // Búsqueda de mensajeros por ruta
  search: (params: URLSearchParams) =>
    req<{ results: CourierSearchItem[]; alternatives: string[] }>(`/api/v2/search?${params.toString()}`, { auth: false }),

  // Pasaporte completo del mensajero
  passport: (courierId: string) =>
    req<PassportDto>(`/api/v2/couriers/${courierId}`, { auth: false }),

  // Planes y herramientas (públicos)
  plans: () => req<{ plans: PlanDto[] }>('/api/v2/plans', { auth: false }),
  tools: () => req<{ tools: ToolDto[] }>('/api/v2/tools', { auth: false }),

  // Rutas populares (activas, sin sesión)
  popularRoutes: () =>
    req<{ routes: RouteDto[]; couriers: Record<string, string> }>('/api/v2/routes/popular', { auth: false }),

  // ─── Perfil propio ────────────────────────────────────────────────────────
  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    req<{ user: SessionUser }>('/api/v2/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ─── Sesión ───────────────────────────────────────────────────────────────
  report: (targetType: string, targetId: string, reason: string) =>
    req<{ ok: true }>('/api/v2/reports', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, reason }),
    }),

  // ─── Favoritos y guardados ────────────────────────────────────────────────
  favorites: () =>
    req<{ couriers: CourierSearchItem[] }>('/api/v2/favorites'),
  toggleFavorite: (courierId: string) =>
    req<{ favorite: boolean }>('/api/v2/favorites', {
      method: 'POST',
      body: JSON.stringify({ courierId }),
    }),

  savedRoutes: () => req<{ routes: SavedRouteDto[] }>('/api/v2/saved-routes'),
  addSavedRoute: (originId: string, destinationId: string, label: string, alertsEnabled: boolean) =>
    req<{ route: SavedRouteDto }>('/api/v2/saved-routes', {
      method: 'POST',
      body: JSON.stringify({ originId, destinationId, label, alertsEnabled }),
    }),
  deleteSavedRoute: (id: string) =>
    req<{ ok: true }>(`/api/v2/saved-routes/${id}`, { method: 'DELETE' }),

  // ─── Mensajes ─────────────────────────────────────────────────────────────
  conversations: () => req<{ conversations: ConversationDto[] }>('/api/v2/conversations'),
  startConversation: (courierUserId: string) =>
    req<{ conversation: ConversationDto }>('/api/v2/conversations', {
      method: 'POST',
      body: JSON.stringify({ courierUserId }),
    }),
  messages: (conversationId: string) =>
    req<{ messages: MessageDto[] }>(`/api/v2/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, body: string) =>
    req<{ message: MessageDto }>(`/api/v2/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  // ─── Notificaciones ───────────────────────────────────────────────────────
  notifications: () => req<{ notifications: NotificationDto[] }>('/api/v2/notifications'),
  markNotificationRead: (id: string) =>
    req<{ ok: true }>(`/api/v2/notifications/${id}/read`, { method: 'POST' }),

  // ─── Mensajero ────────────────────────────────────────────────────────────
  courierDashboard: () => req<CourierDashboardDto>('/api/v2/courier/me'),
  updateCourierProfile: (data: {
    bio?: string
    yearsExperience?: number
    vehicleSummary?: string
    availabilityNote?: string
    baseFeeCup?: number | null
    contactPreference?: string
    services?: string[]
  }) =>
    req<{ ok: true }>('/api/v2/courier/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  courierRoutes: () => req<{ routes: RouteDto[] }>('/api/v2/courier/me/routes'),
  createRoute: (data: Record<string, unknown>) =>
    req<{ route: RouteDto }>('/api/v2/courier/me/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoute: (id: string, data: Record<string, unknown>) =>
    req<{ route: RouteDto }>(`/api/v2/courier/me/routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteRoute: (id: string) =>
    req<{ ok: true }>(`/api/v2/courier/me/routes/${id}`, { method: 'DELETE' }),
  courierReviews: () =>
    req<{ reviews: ReviewDto[]; distribution: Record<string, number> }>('/api/v2/courier/me/reviews'),
  courierWallet: () => req<WalletDto>('/api/v2/courier/me/wallet'),
  requestMembership: (planCode: string, payment: { amountCup: number; method: string; reference: string; proofUrl?: string }) =>
    req<{ ok: true; status: string }>('/api/v2/courier/me/membership', {
      method: 'POST',
      body: JSON.stringify({ planCode, ...payment }),
    }),
  submitVerification: (data: { documentUrl?: string; note: string }) =>
    req<{ ok: true }>('/api/v2/courier/me/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Pagos (Transfermóvil) ───────────────────────────────────────────────
  // El mensajero elige plan → recibe instrucciones → paga → sube captura →
  // el propietario/admin coteja y decide (approve/reject).
  requestPlan: (planId: string) =>
    req<RequestPlanResponseDto>('/api/v2/payments/request', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  // Subida de la captura (multipart/form-data; el JWT va en el header).
  uploadPaymentProof: async (proofId: string, file: File): Promise<{ proof: PaymentProofDto }> => {
    const token = await getAccessToken()
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/v2/payments/${proofId}/proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Error ${res.status}`)
    }
    return res.json() as Promise<{ proof: PaymentProofDto }>
  },

  getMyPayments: () =>
    req<{ payments: PaymentProofDto[] }>('/api/v2/payments/mine'),

  // ─── Administración ───────────────────────────────────────────────────────
  adminOverview: () => req<AdminOverviewDto>('/api/v2/admin/overview'),
  adminCouriers: (status?: string) =>
    req<{ couriers: AdminCourierDto[] }>(`/api/v2/admin/couriers${status ? `?status=${status}` : ''}`),
  adminReviewVerification: (courierId: string, decision: 'verified' | 'rejected', note: string) =>
    req<{ ok: true }>(`/api/v2/admin/couriers/${courierId}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),
  adminAccounts: () => req<{ accounts: AdminAccountDto[] }>('/api/v2/admin/accounts'),
  adminPayments: (status?: string) =>
    req<{ payments: AdminPaymentDto[] }>(`/api/v2/admin/payments${status ? `?status=${status}` : ''}`),
  // Variante del contrato T8: mismo endpoint, nombre explícito para la UI.
  getAdminPayments: (status?: 'pending' | 'approved' | 'rejected' | 'all') =>
    req<{ payments: AdminPaymentDto[] }>(`/api/v2/admin/payments${status ? `?status=${status}` : ''}`),
  // Decisión del propietario/admin sobre una solicitud de pago (Transfermóvil).
  decidePayment: (id: string, payload: DecidePaymentPayload) =>
    req<{ ok: true; status: string; expiresAt?: string }>(`/api/v2/admin/payments/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminReviewPayment: (id: string, decision: 'approved' | 'rejected', note: string) =>
    req<{ ok: true }>(`/api/v2/admin/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note }),
    }),
  adminSavePlan: (plan: Partial<PlanDto> & { code: string }) =>
    req<{ plan: PlanDto }>('/api/v2/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    }),
  adminSaveTool: (tool: Partial<ToolDto> & { code: string }) =>
    req<{ tool: ToolDto }>('/api/v2/admin/tools', {
      method: 'POST',
      body: JSON.stringify(tool),
    }),
  adminModeration: () =>
    req<{ reports: ReportFlagDto[]; audit: AuditLogDto[] }>('/api/v2/admin/moderation'),
  adminResolveReport: (id: string, status: 'reviewed' | 'dismissed') =>
    req<{ ok: true }>(`/api/v2/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  adminSystem: () => req<SystemStatusDto>('/api/v2/admin/system'),
  adminConfig: () =>
    req<{ config: Record<string, string> }>('/api/v2/admin/config'),
  adminSaveConfig: (config: Record<string, string>) =>
    req<{ ok: true }>('/api/v2/admin/config', {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),
}
