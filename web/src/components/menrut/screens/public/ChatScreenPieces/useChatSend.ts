// MENRUT — ChatScreen · envío optimista (socket + fallback REST) y reintento.
'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { getChatSocket } from '@/lib/socket'
import { ACK_TIMEOUT_MS, isAckOk, isMessageDto, makeLocal, toBubble, type ChatBubble } from './data'

export function useChatSend({
  conversationId,
  pending,
  setPending,
  qc,
}: {
  conversationId: string
  pending: ChatBubble[]
  setPending: Dispatch<SetStateAction<ChatBubble[]>>
  qc: QueryClient
}) {
  // ── Envío optimista con socket + fallback REST ──
  async function restSend(key: string, body: string) {
    try {
      const { message } = await api.sendMessage(conversationId as string, body)
      setPending((prev) => prev.map((b) => (b.key === key ? toBubble(message) : b)))
      qc.invalidateQueries({ queryKey: ['messages', conversationId] })
    } catch {
      setPending((prev) => prev.map((b) => (b.key === key ? { ...b, status: 'error' } : b)))
      toast.error('No se envió. Toca para reintentar.')
    }
  }

  async function send(body: string) {
    const text = body.trim()
    if (!text || !conversationId) return
    const local = makeLocal(text)
    setPending((prev) => [...prev, local])

    const socket = getChatSocket()
    let token: string | null = null
    try {
      token = await getAccessToken()
    } catch {
      token = null
    }
    if (!socket.connected || !token) {
      // Socket desconectado o sin token → directamente por REST (adjunta JWT).
      void restSend(local.key, text)
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        void restSend(local.key, text)
      }
    }, ACK_TIMEOUT_MS)

    try {
      socket.emit(
        'chat:send',
        { conversationId, token, body: text },
        (ack: unknown) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          if (isAckOk(ack) && ack.ok) {
            const confirmed = ack.message
            if (isMessageDto(confirmed)) {
              setPending((prev) => prev.map((b) => (b.key === local.key ? toBubble(confirmed) : b)))
            } else {
              // Confirmado por el servicio, sin copia del mensaje: pedimos historial.
              setPending((prev) => prev.map((b) => (b.key === local.key ? { ...b, status: 'sent' } : b)))
              qc.invalidateQueries({ queryKey: ['messages', conversationId] })
            }
          } else {
            // El servicio rechazó el envío: probamos por REST antes de marcar error.
            void restSend(local.key, text)
          }
        }
      )
    } catch {
      clearTimeout(timer)
      void restSend(local.key, text)
    }
  }

  function retry(key: string) {
    const bubble = pending.find((b) => b.key === key)
    if (!bubble) return
    setPending((prev) => prev.map((b) => (b.key === key ? { ...b, status: 'sending' } : b)))
    void restSend(key, bubble.body)
  }

  return { send, retry }
}
