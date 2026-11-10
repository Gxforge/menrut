// MENRUT — Piezas de AdminPaymentsScreen: diálogo de ampliación del
// comprobante de pago a tamaño completo.
'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCup } from '@/lib/format'
import type { AdminPaymentDto } from '@/lib/types'

export function ProofZoomDialog({
  zoom,
  onClose,
}: {
  zoom: AdminPaymentDto | null
  onClose: () => void
}) {
  return (
    <Dialog open={zoom !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[380px] rounded-2xl p-4">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[14px]">
            Comprobante de {zoom?.courierName}
          </DialogTitle>
          <DialogDescription>
            {zoom?.planName ?? 'Sin plan'} · {zoom ? formatCup(zoom.amountCup) : ''}
          </DialogDescription>
        </DialogHeader>
        {zoom?.proofSignedUrl ? (
          <img
            src={zoom.proofSignedUrl}
            alt={`Comprobante de pago de ${zoom.courierName}`}
            className="max-h-[62dvh] w-full rounded-xl border border-line bg-muted object-contain"
          />
        ) : null}
        <p className="text-center text-[10.5px] text-muted-foreground">
          La imagen caduca a los 10 minutos de cargar la lista; refresca si no se ve.
        </p>
      </DialogContent>
    </Dialog>
  )
}
