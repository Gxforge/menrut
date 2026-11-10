// MENRUT — ChatScreen · burbuja de mensaje y esqueleto de carga.
'use client'

import { AlertCircle, Check, CheckCheck, Clock3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ChatBubble } from './data'

// ─── Burbuja de mensaje ─────────────────────────────────────────────────────

export function Bubble({ bubble: b, onRetry }: { bubble: ChatBubble; onRetry: () => void }) {
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

export function BubbleSkeleton({ mine }: { mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <Skeleton className={cn('h-9 rounded-2xl', mine ? 'w-40 rounded-br-md' : 'w-48 rounded-bl-md')} />
    </div>
  )
}
