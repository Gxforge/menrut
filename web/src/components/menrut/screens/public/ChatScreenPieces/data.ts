// MENRUT — ChatScreen · tipos, constantes y utilidades puras del chat.
import { getChatSocket } from '@/lib/socket'
import type { MessageDto, Role } from '@/lib/types'

// ─── Tipos locales ──────────────────────────────────────────────────────────

export interface ChatBubble {
  key: string
  id: string | null // id del servidor una vez confirmado
  mine: boolean
  body: string
  createdAt: string
  createdMs: number
  readAt: string | null
  status: 'sending' | 'sent' | 'error'
}

export function toBubble(m: MessageDto): ChatBubble {
  const ms = new Date(m.createdAt).getTime()
  return {
    key: m.id,
    id: m.id,
    mine: m.mine,
    body: m.body,
    createdAt: m.createdAt,
    createdMs: ms,
    readAt: m.readAt,
    status: 'sent',
  }
}

export function makeLocal(body: string): ChatBubble {
  const now = Date.now()
  return {
    key: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    mine: true,
    body,
    createdAt: new Date(now).toISOString(),
    createdMs: now,
    readAt: null,
    status: 'sending',
  }
}

export function isMessageDto(v: unknown): v is MessageDto {
  return (
    typeof v === 'object' && v !== null &&
    'id' in v && 'body' in v && 'conversationId' in v &&
    typeof (v as { id: unknown }).id === 'string'
  )
}

export function isAckOk(v: unknown): v is { ok?: boolean; message?: unknown; error?: string } {
  return typeof v === 'object' && v !== null
}

export const ROLE_LABELS: Record<Role, string> = {
  courier: 'Mensajero',
  client: 'Cliente',
  business: 'Negocio',
  admin: 'Equipo MENRUT',
  owner: 'Propietario',
  moderator: 'Moderación',
}

export const ACK_TIMEOUT_MS = 3000
export const MAX_LENGTH = 2000

// ─── Estado «en vivo» del socket (useSyncExternalStore) ─────────────────────

export function subscribeSocketStatus(cb: () => void) {
  const socket = getChatSocket()
  socket.on('connect', cb)
  socket.on('disconnect', cb)
  socket.on('connect_error', cb)
  return () => {
    socket.off('connect', cb)
    socket.off('disconnect', cb)
    socket.off('connect_error', cb)
  }
}

export function getSocketSnapshot(): boolean {
  return getChatSocket().connected
}

export function getServerSnapshot(): boolean {
  return false
}
