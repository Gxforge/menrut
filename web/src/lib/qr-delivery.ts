// MENRUT — validación de entrega por QR (v2.3). Lógica pura, sin dependencias de UI.
// El QR contiene la entrega y el código; el escaneo se acepta al instante si
// coincide con la tarjeta del chat y se encola para sincronizar con el servidor.

export const QR_PREFIX = 'MENRUT-ENTREGA'
export const QR_VERSION = '1'
export const QUEUE_KEY = 'menrut-qr-queue-v1'
export const QUEUE_RETENTION_MS = 24 * 60 * 60 * 1000

export type DeliveryStatus = 'pending' | 'client_confirmed' | 'confirmed' | 'cancelled' | 'expired'
export type QrAction = 'client-confirm' | 'verify'

export interface QrScan {
  deliveryId: string
  code: string
}

export interface QrQueueItem extends QrScan {
  id: string
  conversationId: string
  action: QrAction
  createdAt: number
  state: 'queued' | 'void'
  reason?: string
}

export function buildQrPayload(deliveryId: string, code: string): string {
  return [QR_PREFIX, QR_VERSION, deliveryId, code].join('|')
}

/** Devuelve la entrega y el código si el texto es un QR de MENRUT válido; si no, null. */
export function parseQrPayload(text: string): QrScan | null {
  const parts = text.trim().split('|')
  if (parts.length !== 4 || parts[0] !== QR_PREFIX || parts[1] !== QR_VERSION) return null
  const [, , deliveryId, code] = parts
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(deliveryId)) return null
  if (!/^\d{6}$/.test(code)) return null
  return { deliveryId, code }
}

export interface CardState {
  deliveryId: string
  status: DeliveryStatus
  expiresAt: number
}

/** Decide si el escaneo se acepta al instante según el estado visible de la tarjeta. */
export function localDecision(
  card: CardState,
  scan: QrScan,
  viewerIsCourier: boolean,
  now = Date.now(),
): { ok: true; action: QrAction } | { ok: false; reason: string } {
  if (scan.deliveryId !== card.deliveryId) return { ok: false, reason: 'Este QR es de otra entrega.' }
  if (card.status === 'cancelled') return { ok: false, reason: 'El código está cancelado.' }
  if (card.status === 'confirmed') return { ok: false, reason: 'Esta entrega ya está verificada.' }
  if (card.status === 'expired' || card.expiresAt <= now) return { ok: false, reason: 'El código ya venció.' }
  if (viewerIsCourier) {
    if (card.status !== 'client_confirmed') {
      return { ok: false, reason: 'El cliente aún no ha confirmado la recepción.' }
    }
    return { ok: true, action: 'verify' }
  }
  if (card.status !== 'pending') return { ok: false, reason: 'La recepción ya fue confirmada.' }
  return { ok: true, action: 'client-confirm' }
}

export type SendResult = { kind: 'ok' } | { kind: 'rejected'; reason: string } | { kind: 'retry' }

/** Envía los elementos en cola en orden. Los errores de red o 5xx se reintentan; los 4xx anulan. */
export async function flushQueue(
  items: QrQueueItem[],
  send: (item: QrQueueItem) => Promise<SendResult>,
): Promise<QrQueueItem[]> {
  const out: QrQueueItem[] = []
  for (const item of items) {
    if (item.state !== 'queued') {
      out.push(item)
      continue
    }
    const r = await send(item)
    if (r.kind === 'ok') continue // se elimina de la cola al confirmarse
    if (r.kind === 'rejected') out.push({ ...item, state: 'void', reason: r.reason })
    else out.push(item)
  }
  return out
}

/** Quita elementos anulados con más de 24 h y conserva el resto. */
export function pruneQueue(items: QrQueueItem[], now = Date.now()): QrQueueItem[] {
  return items.filter((i) => i.state === 'queued' || now - i.createdAt < QUEUE_RETENTION_MS)
}

export function readQueue(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): QrQueueItem[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(QUEUE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as QrQueueItem[]) : []
  } catch {
    return []
  }
}

export function writeQueue(items: QrQueueItem[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  if (!storage) return
  try {
    storage.setItem(QUEUE_KEY, JSON.stringify(pruneQueue(items)))
  } catch {
    /* almacenamiento lleno o no disponible: la cola se pierde sin romper la app */
  }
}

export function clearQrQueue(): void {
  try {
    safeStorage()?.removeItem(QUEUE_KEY)
  } catch {
    /* sin acceso a almacenamiento */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
