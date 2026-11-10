// MENRUT — API (parte 2): entregas verificadas por OTP, herramientas con
// reserva→confirmación→liberación, respuestas del mensajero a reseñas y
// borrado de cuenta (privacidad). Mismo contrato tipado que api.ts; vive
// aparte para respetar el límite de 300 líneas por archivo.
import { req } from './api'
import type {
  CourierToolsDto, ToolReservationDto, CreatedDeliveryDto, DeliveryDto, ReviewDto,
} from './types'

export const apiMore = {
  // ─── Entregas verificadas por OTP ─────────────────────────────────────
  // El cliente genera un código de 6 dígitos desde el pasaporte del mensajero;
  // al recibir el paquete se lo dicta y el mensajero lo verifica en su panel.
  createDelivery: (courierUserId: string) =>
    req<CreatedDeliveryDto>('/deliveries', {
      method: 'POST',
      body: JSON.stringify({ courierUserId }),
    }),

  myDeliveries: () =>
    req<{ deliveries: DeliveryDto[] }>('/deliveries/mine'),

  courierDeliveries: () =>
    req<{ deliveries: DeliveryDto[] }>('/courier/me/deliveries'),

  verifyDelivery: (deliveryId: string, code: string) =>
    req<{ ok: true; verifiedDeliveries: number }>(`/courier/me/deliveries/${deliveryId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // ─── Herramientas (reserva → confirmación → liberación) ──────────────
  courierTools: () =>
    req<CourierToolsDto>('/courier/me/tools'),

  reserveTool: (toolId: string) =>
    req<{ reservation: ToolReservationDto & { expiresAt: number } }>(`/courier/me/tools/${toolId}/reserve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  confirmTool: (toolId: string, reservationId: string) =>
    req<{ ok: true; effect: { type: string; until?: number; days?: number; notified?: number } }>(`/courier/me/tools/${toolId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ reservationId }),
    }),

  releaseTool: (toolId: string, reservationId: string) =>
    req<{ ok: true; toolCredits: number }>(`/courier/me/tools/${toolId}/release`, {
      method: 'POST',
      body: JSON.stringify({ reservationId }),
    }),

  // ─── Respuestas del mensajero a reseñas ──────────────────────────────
  respondReview: (reviewId: string, response: string) =>
    req<{ review: ReviewDto; updatedAt: string }>(`/courier/me/reviews/${reviewId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),

  // ─── Privacidad: eliminar mi cuenta ──────────────────────────────────
  deleteAccount: () =>
    req<{ ok: true; authRemoved: boolean }>('/me', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'BORRAR' }),
    }),
}
