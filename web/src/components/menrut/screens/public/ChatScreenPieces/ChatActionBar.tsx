// MENRUT — ChatScreen · barra de acciones de entrega: el cliente pide código;
// el mensajero registra el encargo.
'use client'

import { KeyRound, Loader2, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatActionBar({
  isCourier,
  requestPending,
  onRequestCode,
  onOpenEncargo,
}: {
  isCourier: boolean
  requestPending: boolean
  onRequestCode: () => void
  onOpenEncargo: () => void
}) {
  return (
    <div className="flex gap-2 border-t border-line/70 bg-card/95 px-3 pt-2.5">
      {isCourier ? (
        <Button type="button" variant="secondary" className="h-9 rounded-full px-3 text-[12px] font-semibold" onClick={onOpenEncargo}>
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          Generar encargo
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-full px-3 text-[12px] font-semibold"
          disabled={requestPending}
          onClick={onRequestCode}
        >
          {requestPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <KeyRound className="h-3.5 w-3.5" aria-hidden />}
          Generar código de entrega
        </Button>
      )}
    </div>
  )
}
