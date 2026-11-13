// MENRUT — ChatScreen · área de mensajes (historial, vacío, error y burbujas).
'use client'

import type { RefObject } from 'react'
import { RefreshCw } from 'lucide-react'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import type { ChatBubble } from './data'
import type { EventActions } from './EventCard'
import { Bubble, BubbleSkeleton } from './Bubble'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function MessageList({
  scrollRef,
  endRef,
  isLoading,
  isError,
  onRetryLoad,
  bubbles,
  onRetry,
  hasMore,
  loadingOlder,
  onLoadOlder,
  viewerIsCourier,
  actions,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  endRef: RefObject<HTMLDivElement | null>
  isLoading: boolean
  isError: boolean
  onRetryLoad: () => void
  bubbles: ChatBubble[]
  onRetry: (key: string) => void
  hasMore: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  viewerIsCourier: boolean
  actions: EventActions
}) {
  return (
    <div ref={scrollRef} className="nice-scroll flex-1 overflow-y-auto px-4 py-3" aria-label="Mensajes">
      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando historial">
          <BubbleSkeleton mine={false} />
          <BubbleSkeleton mine />
          <BubbleSkeleton mine={false} />
          <BubbleSkeleton mine />
        </div>
      ) : isError ? (
        <div className="px-2 pt-4">
          <EmptyState
            icon={<RefreshCw className="h-8 w-8" aria-hidden />}
            title="No pudimos cargar la conversación"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => onRetryLoad()}
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
          {hasMore && (
            <div className="pb-2 text-center">
              <Button
                type="button"
                variant="secondary"
                className="h-8 rounded-full px-3 text-[11.5px]"
                onClick={onLoadOlder}
                disabled={loadingOlder}
              >
                {loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Cargar mensajes anteriores
              </Button>
            </div>
          )}
          <div className="space-y-2.5">
            {bubbles.map((b) => (
              <Bubble
                key={b.key}
                bubble={b}
                onRetry={() => onRetry(b.key)}
                viewerIsCourier={viewerIsCourier}
                actions={actions}
              />
            ))}
          </div>
        </>
      )}
      <div ref={endRef} aria-hidden />
    </div>
  )
}
