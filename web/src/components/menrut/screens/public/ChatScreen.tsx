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
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle, Check, CheckCheck, Clock3, Flag, Loader2, MessageSquare, MoreVertical, RefreshCw, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { useAppStore } from '@/lib/store'
import { getChatSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'
import type { MessageDto, Role } from '@/lib/types'

// ─── Tipos locales ──────────────────────────────────────────────────────────

interface ChatBubble {
  key: string
  id: string | null // id del servidor una vez confirmado
  mine: boolean
  body: string
  createdAt: string
  createdMs: number
  readAt: string | null
  status: 'sending' | 'sent' | 'error'
}

function toBubble(m: MessageDto): ChatBubble {
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

function makeLocal(body: string): ChatBubble {
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

function isMessageDto(v: unknown): v is MessageDto {
  return (
    typeof v === 'object' && v !== null &&
    'id' in v && 'body' in v && 'conversationId' in v &&
    typeof (v as { id: unknown }).id === 'string'
  )
}

function isAckOk(v: unknown): v is { ok?: boolean; message?: unknown; error?: string } {
  return typeof v === 'object' && v !== null
}

const ROLE_LABELS: Record<Role, string> = {
  courier: 'Mensajero',
  client: 'Cliente',
  business: 'Negocio',
  admin: 'Equipo MENRUT',
  owner: 'Propietario',
  moderator: 'Moderación',
}

const ACK_TIMEOUT_MS = 3000
const MAX_LENGTH = 2000

// ─── Estado «en vivo» del socket (useSyncExternalStore) ─────────────────────

function subscribeSocketStatus(cb: () => void) {
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

function getSocketSnapshot(): boolean {
  return getChatSocket().connected
}

function getServerSnapshot(): boolean {
  return false
}

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
  const [roomJoined, setRoomJoined] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const live = useSyncExternalStore(subscribeSocketStatus, getSocketSnapshot, getServerSnapshot)

  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const didScrollRef = useRef(false)

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
      <TopBar
        title={otherName ?? 'Conversación'}
        subtitle={other ? ROLE_LABELS[other.otherRole] : undefined}
        onBack={() => {
          const s = useAppStore.getState()
          if (s.history.length > 0) s.back()
          else s.navigate('inbox')
        }}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Opciones de la conversación"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
              >
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 rounded-xl text-danger focus:text-danger">
                <Flag className="h-4 w-4" aria-hidden />
                Reportar conversación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
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
      <div ref={scrollRef} className="nice-scroll flex-1 overflow-y-auto px-4 py-3" aria-label="Mensajes">
        {history.isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando historial">
            <BubbleSkeleton mine={false} />
            <BubbleSkeleton mine />
            <BubbleSkeleton mine={false} />
            <BubbleSkeleton mine />
          </div>
        ) : history.isError ? (
          <div className="px-2 pt-4">
            <EmptyState
              icon={<RefreshCw className="h-8 w-8" aria-hidden />}
              title="No pudimos cargar la conversación"
              hint="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => history.refetch()}
            />
          </div>
        ) : bubbles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-[13.5px] font-semibold">Todavía no hay mensajes</p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Saluda y acuerda los detalles del envío. Las condiciones del servicio se coordinan
              entre ambas partes.
            </p>
          </div>
        ) : (
          <>
            <p className="pb-2 text-center text-[10.5px] leading-relaxed text-muted-foreground">
              Las condiciones del servicio se coordinan entre ambas partes.
            </p>
            <div className="space-y-2.5">
              {bubbles.map((b) => (
                <Bubble key={b.key} bubble={b} onRetry={() => retry(b.key)} />
              ))}
            </div>
          </>
        )}
        <div ref={endRef} aria-hidden />
      </div>

      {/* Composición: fija al fondo del frame, compacta para el teclado móvil */}
      <div className="border-t border-line/70 bg-card/95 p-3 pb-safe">
        <div className="flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onInput={autoResize}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje"
            className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border-line bg-background px-3.5 py-2.5 text-[13.5px] leading-snug shadow-none focus-visible:ring-blue/25"
          />
          <Button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Enviar mensaje"
            className="h-11 w-11 shrink-0 rounded-full p-0"
          >
            <Send className="h-4.5 w-4.5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Reportar conversación */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reportar conversación</DialogTitle>
            <DialogDescription>
              Cuéntanos qué ocurrió. El equipo revisará el reporte con confidencialidad.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Motivo del reporte (mínimo 10 caracteres)"
            aria-label="Motivo del reporte"
            className="rounded-2xl"
          />
          <DialogFooter>
            <Button variant="secondary" className="h-11 flex-1 rounded-full" onClick={() => setReportOpen(false)} disabled={report.isPending}>
              Cancelar
            </Button>
            <Button className="h-11 flex-1 rounded-full font-semibold" onClick={submitReport} disabled={report.isPending}>
              {report.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Flag className="h-4 w-4" aria-hidden />}
              Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Burbuja de mensaje ─────────────────────────────────────────────────────

function Bubble({ bubble: b, onRetry }: { bubble: ChatBubble; onRetry: () => void }) {
  const time = new Date(b.createdAt).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' })

  if (!b.mine) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2 text-[13.5px] leading-relaxed">
          {b.body}
        </div>
        <span className="pl-1 text-[10px] text-muted-foreground">{time}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div
        className={cn(
          'max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13.5px] leading-relaxed',
          b.status === 'error' ? 'border border-danger/40 bg-card text-foreground' : 'bg-blue text-white'
        )}
      >
        {b.body}
      </div>
      {b.status === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 pr-0.5 text-[10.5px] font-semibold text-danger"
        >
          <AlertCircle className="h-3 w-3" aria-hidden />
          No se envió · Toca para reintentar
        </button>
      ) : (
        <span className="flex items-center gap-1 pr-0.5 text-[10px] text-muted-foreground">
          {time}
          {b.status === 'sending' && <Clock3 className="h-3 w-3" aria-label="Enviando" />}
          {b.status === 'sent' && b.readAt && <CheckCheck className="h-3 w-3" aria-label="Leído" />}
          {b.status === 'sent' && !b.readAt && <Check className="h-3 w-3" aria-label="Enviado" />}
        </span>
      )}
    </div>
  )
}

function BubbleSkeleton({ mine }: { mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <Skeleton className={cn('h-9 rounded-2xl', mine ? 'w-40 rounded-br-md' : 'w-48 rounded-bl-md')} />
    </div>
  )
}
