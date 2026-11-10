// MENRUT — Conversación (chat 1 a 1)
// Historial por HTTP + tiempo real vía socket.io (getChatSocket):
//  - al montar: emit('chat:join', { conversationId })
//  - recibir: socket.on('chat:new', msg) → añade si no existe
//  - enviar: emit('chat:send', { conversationId, body }, ack)
//    · sin ack en 3 s o socket desconectado → fallback api.sendMessage (REST)
// Mensaje optimista con estado «enviando» (reloj), marca de enviado y reintento
// al fallar. No se afirma lectura sin confirmación del servidor (readAt).
// El estado visual se DERIVA (servidor + entrantes en vivo + pendientes locales)
// en lugar de sincronizarse con efectos.
//
// Piezas de esta pantalla en ./ChatScreenPieces/ (datos y envío, burbujas,
// cabecera, lista, composición y reporte); AppRouter sigue importando aquí.
'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { MessageDto } from '@/lib/types'
import { getServerSnapshot, getSocketSnapshot, subscribeSocketStatus, toBubble, type ChatBubble } from './ChatScreenPieces/data'
import { useChatRoom } from './ChatScreenPieces/useChatRoom'
import { useChatSend } from './ChatScreenPieces/useChatSend'
import { ChatHeader } from './ChatScreenPieces/ChatHeader'
import { MessageList } from './ChatScreenPieces/MessageList'
import { Composer } from './ChatScreenPieces/Composer'
import { ReportDialog } from './ChatScreenPieces/ReportDialog'

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const session = useAppStore((s) => s.session)
  const conversationId = useAppStore((s) => s.activeConversationId)
  const otherName = useAppStore((s) => s.activeConversationOtherName)

  const qc = useQueryClient()
  // Mensajes propios pendientes de confirmación (optimistas) y entrantes en vivo
  const [pending, setPending] = useState<ChatBubble[]>([])
  const [incoming, setIncoming] = useState<MessageDto[]>([])
  const [draft, setDraft] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const live = useSyncExternalStore(subscribeSocketStatus, getSocketSnapshot, getServerSnapshot)

  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const didScrollRef = useRef(false)

  // ── Tiempo real: unirse a la sala y escuchar mensajes nuevos ──
  const roomJoined = useChatRoom({
    conversationId,
    setIncoming,
    setPending,
    qc,
  })

  // Historial de la conversación (HTTP). En producción no hay servicio de
  // sockets: cuando la sala en vivo no está activa se sondea cada 8 s para
  // recibir mensajes nuevos del otro participante.
  const history = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.messages(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: roomJoined ? false : 8000,
    refetchIntervalInBackground: false,
  })

  // Datos del otro (rol) para el subtítulo de la barra
  const conversations = useQuery({
    queryKey: ['conversations', session?.id],
    queryFn: () => api.conversations(),
    enabled: !!session,
  })
  const other = useMemo(
    () => conversations.data?.conversations.find((c) => c.id === conversationId),
    [conversations.data, conversationId]
  )

  // ── Burbujas DERIVADAS: servidor + entrantes en vivo + pendientes locales ──
  const bubbles = useMemo<ChatBubble[]>(() => {
    const base = history.data?.messages ?? []
    const baseIds = new Set(base.map((m) => m.id))
    const extra = incoming.filter((m) => !baseIds.has(m.id))
    const server = [...base, ...extra]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toBubble)
    const serverIds = new Set(server.map((s) => s.id))
    const locals = pending.filter((b) => {
      if (b.id !== null) return !serverIds.has(b.id) // aún no refrescado el historial
      if (b.status === 'sent') {
        // «Enviado» sin copia del servidor: se retira cuando el historial
        // refrescado es posterior al envío (el servidor es la fuente de verdad).
        return history.dataUpdatedAt < b.createdMs
      }
      return true // enviando o con error
    })
    return [...server, ...locals]
  }, [history.data, history.dataUpdatedAt, incoming, pending])

  // Refresca la bandeja (badge de no leídos) al cargar el historial
  useEffect(() => {
    if (history.data) {
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }
  }, [history.data, qc])

  // Scroll al fondo al abrir y al llegar mensajes nuevos
  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: 'end',
      behavior: didScrollRef.current ? 'smooth' : 'auto',
    })
    didScrollRef.current = true
  }, [bubbles.length, history.isLoading])

  // ── Envío optimista (socket + fallback REST) y reintento ──
  const { send, retry } = useChatSend({
    conversationId: conversationId as string,
    pending,
    setPending,
    qc,
  })

  function submit() {
    if (!draft.trim()) return
    send(draft)
    setDraft('')
    requestAnimationFrame(() => {
      const el = taRef.current
      if (el) el.style.height = 'auto'
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function autoResize() {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // ── Reportar conversación ──
  const report = useMutation({
    mutationFn: () => api.report('conversation', conversationId as string, reportReason.trim()),
    onSuccess: () => {
      toast.success('Gracias. Nuestro equipo revisará la conversación.')
      setReportOpen(false)
      setReportReason('')
    },
    onError: () => {
      toast.error('No se pudo enviar el reporte. Inténtalo de nuevo.')
    },
  })

  function submitReport() {
    if (reportReason.trim().length < 10) {
      toast.error('Cuéntanos brevemente qué pasó (mínimo 10 caracteres).')
      return
    }
    report.mutate()
  }

  // ── Guardas ──
  if (!conversationId) {
    return (
      <div className="px-4 pt-6">
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" aria-hidden />}
          title="Conversación no disponible"
          hint="Abre la conversación desde tus mensajes para continuar."
          actionLabel="Ir a mensajes"
          onAction={() => useAppStore.getState().navigate('inbox')}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        title={otherName ?? 'Conversación'}
        otherRole={other?.otherRole}
        onBack={() => {
          const s = useAppStore.getState()
          if (s.history.length > 0) s.back()
          else s.navigate('inbox')
        }}
        onReport={() => setReportOpen(true)}
      />

      {!live && (
        <p className="border-b border-line/60 bg-secondary/70 px-4 py-1.5 text-center text-[10.5px] font-medium text-muted-foreground">
          Sin conexión en tiempo real. Tus mensajes se envían de todas formas.
        </p>
      )}
      {live && !roomJoined && (
        <p className="border-b border-line/60 bg-secondary/70 px-4 py-1.5 text-center text-[10.5px] font-medium text-muted-foreground">
          Actualización en vivo no disponible para esta conversación.
        </p>
      )}

      {/* Área de mensajes */}
      <MessageList
        scrollRef={scrollRef}
        endRef={endRef}
        isLoading={history.isLoading}
        isError={history.isError}
        onRetryLoad={() => history.refetch()}
        bubbles={bubbles}
        onRetry={retry}
      />

      {/* Composición: fija al fondo del frame, compacta para el teclado móvil */}
      <Composer
        taRef={taRef}
        draft={draft}
        onDraftChange={setDraft}
        onInput={autoResize}
        onKeyDown={onKeyDown}
        onSubmit={submit}
      />

      {/* Reportar conversación */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reason={reportReason}
        onReasonChange={setReportReason}
        onSubmit={submitReport}
        pending={report.isPending}
      />
    </div>
  )
}
