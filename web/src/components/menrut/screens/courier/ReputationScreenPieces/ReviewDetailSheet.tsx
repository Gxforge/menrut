// MENRUT — ReputationScreen · Detalle de una opinión (sheet inferior).
'use client'

import { Flag } from 'lucide-react'
import { Rating } from '@/components/menrut/core/Rating'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format'
import type { ReviewDto } from '@/lib/types'

interface ReviewDetailSheetProps {
  abierta: ReviewDto | null
  onClose: () => void
  onReport: () => void
}

export function ReviewDetailSheet({ abierta, onClose, onReport }: ReviewDetailSheetProps) {
  return (
    <Sheet open={!!abierta} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-3xl px-5 pb-6">
        <SheetHeader className="px-0 pt-2">
          <SheetTitle>Opinión de {abierta?.authorName}</SheetTitle>
          <SheetDescription>
            {abierta ? formatDateTime(abierta.createdAt) : ''} ·{' '}
            {abierta?.isVerified ? 'Entrega verificada' : 'Sin verificar'}
          </SheetDescription>
        </SheetHeader>

        {abierta && (
          <div className="mt-2 space-y-3">
            <Rating value={abierta.rating} showCount={false} />
            {abierta.comment ? (
              <p className="text-[13.5px] leading-relaxed text-foreground">{abierta.comment}</p>
            ) : (
              <p className="text-[13px] text-muted-foreground">Sin comentario escrito.</p>
            )}

            {abierta.response && (
              <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Tu respuesta</p>
                <p className="mt-1 text-[12.5px] leading-relaxed">{abierta.response}</p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full text-destructive hover:text-destructive"
              onClick={onReport}
            >
              <Flag className="h-4 w-4" aria-hidden />
              Reportar abuso
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Tus valoraciones se gestionan con moderación; no se eliminan desde la app.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
