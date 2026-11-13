// MENRUT — ChatScreen · cola de escaneos QR de entrega (v2.3): acepta al instante y sincroniza.
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  flushQueue,
  localDecision,
  parseQrPayload,
  readQueue,
  writeQueue,
  type CardState,
  type QrAction,
  type QrQueueItem,
  type SendResult,
} from '@/lib/qr-delivery'

async function sendItem(item: QrQueueItem): Promise<SendResult> {
  try {
    if (item.action === 'client-confirm') await api.clientConfirmReceipt(item.conversationId, item.deliveryId)
    else await api.verifyDeliveryCode(item.conversationId, item.deliveryId, item.code)
    return { kind: 'ok' }
  } catch (e) {
    const status = (e as { status?: number }).status
    // 4xx (salvo 401 y 429) = el servidor rechaza el escaneo: se anula.
    // Red, 401, 429 o 5xx = se reintenta en el siguiente sincronismo.
    if (typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 429) {
      return { kind: 'rejected', reason: e instanceof Error ? e.message : 'El servidor rechazó el escaneo.' }
    }
    return { kind: 'retry' }
  }
}

const DONE_TEXT: Record<QrAction, string> = {
  'client-confirm': 'Recepción confirmada.',
  verify: 'Entrega verificada.',
}

export function useQrQueue(conversationId: string, qc: QueryClient) {
  const [items, setItems] = useState<QrQueueItem[]>(() => readQueue())

  const sync = useCallback(async () => {
    const current = readQueue()
    if (!current.some((i) => i.state === 'queued')) {
      setItems(current)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setItems(current)
      return
    }
    const done: QrAction[] = []
    const next = await flushQueue(current, async (item) => {
      const r = await sendItem(item)
      if (r.kind === 'ok') done.push(item.action)
      return r
    })
    writeQueue(next)
    const fresh = readQueue()
    setItems(fresh)
    for (const a of done) toast.success(DONE_TEXT[a])
    for (const v of fresh) {
      const before = current.find((c) => c.id === v.id)
      if (v.state === 'void' && before?.state !== 'void') toast.error(`Escaneo anulado: ${v.reason ?? 'rechazado por el servidor.'}`)
    }
    if (done.length || next.length !== current.length) {
      void qc.invalidateQueries({ queryKey: ['messages'] })
    }
  }, [qc])

  useEffect(() => {
    void sync()
    const onOnline = () => void sync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [sync])

  /** Valida el QR con la tarjeta visible y, si procede, lo encola para sincronizar. */
  const scan = useCallback(
    (text: string, card: CardState, viewerIsCourier: boolean) => {
      const parsed = parseQrPayload(text)
      if (!parsed) {
        toast.error('Este QR no es de una entrega de MENRUT.')
        return
      }
      const decision = localDecision(card, parsed, viewerIsCourier)
      if (!decision.ok) {
        toast.error(decision.reason)
        return
      }
      const current = readQueue()
      if (current.some((i) => i.state === 'queued' && i.deliveryId === parsed.deliveryId && i.action === decision.action)) {
        toast.message('Ya hay un escaneo de esta entrega pendiente de sincronizar.')
        return
      }
      writeQueue([
        ...current,
        {
          ...parsed,
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          action: decision.action,
          createdAt: Date.now(),
          state: 'queued',
        },
      ])
      toast.success(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'Escaneo aceptado. Se enviará al recuperar la conexión.'
          : 'Escaneo aceptado. Sincronizando…',
      )
      void sync()
    },
    [conversationId, sync],
  )

  return { items: items.filter((i) => i.conversationId === conversationId), scan }
}
