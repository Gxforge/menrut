// MENRUT — ChatScreen · historial: página más reciente del servidor, páginas
// anteriores bajo demanda y caché del dispositivo (3 días en total).
'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { mergeById, purgeChatCache, readChatCache, writeChatCache } from '@/lib/chat-cache'
import type { MessageDto } from '@/lib/types'

type HistoryPage = { messages: MessageDto[]; hasMore?: boolean; nextBefore?: number | null } | undefined

export function useChatHistory(conversationId: string | null, data: HistoryPage, incoming: MessageDto[]) {
  // Páginas anteriores a la más reciente (cursor = rowid). undefined = aún no se pidió ninguna.
  const [olderItems, setOlderItems] = useState<MessageDto[]>([])
  const [olderCursor, setOlderCursor] = useState<number | null | undefined>(undefined)
  const [loadingOlder, setLoadingOlder] = useState(false)
  // Lo guardado en este dispositivo para la conversación (se lee una vez por conversación).
  const cached = useMemo(() => (conversationId ? readChatCache(conversationId) : []), [conversationId])

  useEffect(() => {
    purgeChatCache()
  }, [])

  useEffect(() => {
    setOlderItems([])
    setOlderCursor(undefined)
  }, [conversationId])

  useEffect(() => {
    if (conversationId && data) writeChatCache(conversationId, data.messages)
  }, [conversationId, data])

  useEffect(() => {
    if (conversationId) writeChatCache(conversationId, [...incoming, ...olderItems])
  }, [conversationId, incoming, olderItems])

  const cursor = olderCursor === undefined ? (data?.nextBefore ?? null) : olderCursor
  const hasMore = olderCursor === undefined ? !!data?.hasMore : olderCursor !== null

  async function loadOlder() {
    if (cursor === null || !conversationId) return
    setLoadingOlder(true)
    try {
      const r = await api.messages(conversationId, cursor)
      setOlderItems((prev) => mergeById(r.messages, prev))
      setOlderCursor(r.nextBefore ?? null)
    } catch {
      toast.error('No se pudieron cargar los mensajes anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  // Orden: caché del dispositivo < páginas anteriores < servidor (el servidor gana en empates).
  const messages = useMemo(
    () => mergeById(cached, olderItems, data?.messages ?? []),
    [cached, olderItems, data],
  )

  return { messages, hasMore, loadingOlder, loadOlder }
}
