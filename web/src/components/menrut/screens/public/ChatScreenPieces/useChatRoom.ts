// MENRUT — ChatScreen · sala en tiempo real: join/leave y mensajes entrantes.
'use client'

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/lib/auth'
import { getChatSocket } from '@/lib/socket'
import type { MessageDto } from '@/lib/types'
import { isAckOk, isMessageDto, toBubble, type ChatBubble } from './data'

export function useChatRoom({
  conversationId,
  setIncoming,
  setPending,
  qc,
}: {
  conversationId: string | null
  setIncoming: Dispatch<SetStateAction<MessageDto[]>>
  setPending: Dispatch<SetStateAction<ChatBubble[]>>
  qc: QueryClient
}): boolean {
  const [roomJoined, setRoomJoined] = useState(false)

  // ── Tiempo real: unirse a la sala y escuchar mensajes nuevos ──
  const onNewMessage = useCallback(
    (msg: unknown) => {
      if (!isMessageDto(msg) || msg.conversationId !== conversationId) return
      setIncoming((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (msg.mine) {
        // Confirmación en vivo de un envío propio pendiente (ack perdido).
        setPending((prev) => {
          const idx = prev.findIndex(
            (b) => b.id === null && b.status !== 'error' && b.body === msg.body
          )
          if (idx < 0) return prev
          const copy = [...prev]
          copy[idx] = toBubble(msg)
          return copy
        })
      }
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    [conversationId, qc]
  )

  useEffect(() => {
    if (!conversationId) return
    const socket = getChatSocket()
    // El servicio de chat valida el JWT en cada join/send.
    const join = async () => {
      try {
        const token = await getAccessToken()
        socket.emit('chat:join', { conversationId, token }, (res: unknown) => {
          setRoomJoined(isAckOk(res) && res.ok === true)
        })
      } catch {
        // Sin sesión/token: el historial y el envío usan HTTP.
        setRoomJoined(false)
      }
    }
    const onConnect = () => void join()
    if (socket.connected) void join()
    socket.on('connect', onConnect)
    socket.on('chat:new', onNewMessage)
    return () => {
      socket.off('connect', onConnect)
      socket.off('chat:new', onNewMessage)
      try {
        socket.emit('chat:leave', { conversationId })
      } catch {
        // sin conexión: nada que limpiar
      }
    }
  }, [conversationId, onNewMessage])

  return roomJoined
}
