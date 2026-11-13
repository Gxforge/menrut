// MENRUT — ChatScreen · tarjeta de evento (código de entrega y encargo).
'use client'

import { useState } from 'react'
import { ClipboardCheck, KeyRound, Loader2, PackageCheck, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DeliveryCodePayload, EncargoPayload } from '@/lib/types'
import { buildQrPayload, type CardState, type QrQueueItem } from '@/lib/qr-delivery'
import { QrImage, QrScanner } from './QrDelivery'
import type { ChatBubble } from './data'

const STATUS_LABEL: Record<DeliveryCodePayload['status'], string> = {
  pending: 'Pendiente de confirmación del cliente',
  client_confirmed: 'Recepción confirmada por el cliente',
  confirmed: 'Entrega verificada',
  cancelled: 'Código cancelado',
  expired: 'Código vencido',
}

export interface EventActions {
  clientConfirm: (deliveryId: string) => void
  cancelCode: (deliveryId: string) => void
  verifyCode: (deliveryId: string, code: string) => void
  /** Valida el QR con la tarjeta visible; acepta al instante y sincroniza. */
  scanQr: (text: string, card: CardState, viewerIsCourier: boolean) => void
  /** Escaneos de esta conversación pendientes o anulados. */
  queued: QrQueueItem[]
  busy: boolean
}

export function EventCard({
  bubble,
  viewerIsCourier,
  actions,
}: {
  bubble: ChatBubble
  viewerIsCourier: boolean
  actions: EventActions
}) {
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)

  if (bubble.kind === 'encargo') {
    const p = bubble.payload as EncargoPayload | null
    return (
      <div className="mx-auto w-full max-w-[90%] rounded-2xl border border-line bg-secondary/60 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold">
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          Encargo creado
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">{p?.description || bubble.body}</p>
      </div>
    )
  }

  if (bubble.kind !== 'delivery_code') return null
  const p = bubble.payload as DeliveryCodePayload | null
  if (!p) return null
  // Un código pendiente o confirmado por el cliente que ya pasó su fecha está vencido.
  const open = p.status === 'pending' || p.status === 'client_confirmed'
  const status: DeliveryCodePayload['status'] = open && p.expiresAt <= Date.now() ? 'expired' : p.status
  // El código y su QR son del cliente: el mensajero no los ve y verifica escaneando el QR del cliente.
  const showCode = !viewerIsCourier && (status === 'pending' || status === 'client_confirmed')
  const canScan = viewerIsCourier && status === 'client_confirmed'

  return (
    <div className="mx-auto w-full max-w-[90%] space-y-2.5 rounded-2xl border border-line bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold">
        <KeyRound className="h-3.5 w-3.5" aria-hidden />
        Código de entrega
      </p>

      {showCode && (
        <p className="select-all text-center font-mono text-[22px] font-bold tracking-[0.3em]" aria-label={`Código ${p.code}`}>
          {p.code}
        </p>
      )}

      <p className="text-[12px] text-muted-foreground">{STATUS_LABEL[status]}</p>

      {showCode && <QrImage text={buildQrPayload(p.deliveryId, p.code)} />}
      {showCode && (
        <p className="text-center text-[12px] text-muted-foreground">
          Muéstrale este QR al mensajero para verificar la entrega.
        </p>
      )}

      {canScan && (
        <div className="space-y-2">
          {!scanning && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full rounded-full text-[13px]"
              onClick={() => setScanning(true)}
            >
              <QrCode className="h-4 w-4" aria-hidden />
              Escanear QR del cliente
            </Button>
          )}
          {scanning && (
            <QrScanner
              onResult={(text) => {
                setScanning(false)
                actions.scanQr(text, { deliveryId: p.deliveryId, status, expiresAt: p.expiresAt }, viewerIsCourier)
              }}
              onClose={() => setScanning(false)}
            />
          )}
        </div>
      )}

      {actions.queued
        .filter((q) => q.deliveryId === p.deliveryId)
        .map((q) =>
          q.state === 'queued' ? (
            <p key={q.id} className="text-[12px] text-muted-foreground">Escaneo guardado. Sincronizando…</p>
          ) : (
            <p key={q.id} className="text-[12px] font-medium text-destructive">Escaneo anulado: {q.reason}</p>
          ),
        )}

      {/* Cliente: confirma la recepción o cancela (si no hay encargo ni confirmación). */}
      {!viewerIsCourier && status === 'pending' && (
        <div className="flex gap-2">
          <Button
            type="button"
            className="h-10 flex-1 rounded-full text-[13px] font-semibold"
            disabled={actions.busy}
            onClick={() => actions.clientConfirm(p.deliveryId)}
          >
            {actions.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PackageCheck className="h-4 w-4" aria-hidden />}
            Confirmar recepción
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 flex-1 rounded-full text-[13px]"
            disabled={actions.busy}
            onClick={() => actions.cancelCode(p.deliveryId)}
          >
            Cancelar código
          </Button>
        </div>
      )}

      {!viewerIsCourier && status === 'client_confirmed' && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Esperando a que el mensajero escriba el código para verificar la entrega.
        </p>
      )}

      {/* Mensajero: solo puede escribir el código tras la confirmación del cliente. */}
      {viewerIsCourier && status === 'pending' && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Esperando a que el cliente confirme la recepción en la app.
        </p>
      )}

      {viewerIsCourier && status === 'client_confirmed' && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^\d{6}$/.test(code)) actions.verifyCode(p.deliveryId, code)
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="Escribe el código de entrega"
            className="h-10 flex-1 rounded-full text-center font-mono text-[15px] tracking-[0.25em]"
          />
          <Button
            type="submit"
            className="h-10 rounded-full px-4 text-[13px] font-semibold"
            disabled={actions.busy || code.length !== 6}
          >
            {actions.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Verificar entrega'}
          </Button>
        </form>
      )}
    </div>
  )
}
