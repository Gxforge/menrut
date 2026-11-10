// MENRUT — ReputationScreen · Detalle de una opinión (sheet inferior).
// Incluye la RESPUESTA del mensajero: primera respuesta o edición de la
// existente (máx. 600 caracteres; notifica al cliente solo la primera vez).
'use client'

import { useEffect, useState } from 'react'
import { Flag, Loader2, MessageSquareReply } from 'lucide-react'
import { Rating } from '@/components/menrut/core/Rating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format'
import type { ReviewDto } from '@/lib/types'

interface ReviewDetailSheetProps {
  abierta: ReviewDto | null
  onClose: () => void
  onReport: () => void
  onRespond: (reviewId: string, response: string) => void
  respondPending: boolean
}

export function ReviewDetailSheet({ abierta, onClose, onReport, onRespond, respondPending }: ReviewDetailSheetProps) {
  const [respondiendo, setRespondiendo] = useState(false)
  const [texto, setTexto] = useState('')

  // Al abrir una opinión, la caja arranca con la respuesta existente (editar).
  useEffect(() => {
    setRespondiendo(false)
    setTexto(abierta?.response ?? '')
  }, [abierta?.id, abierta?.response])

  function enviar() {
    if (!abierta || !texto.trim()) return
    onRespond(abierta.id, texto.trim())
  }

  return (
    <Sheet open={!!abierta} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] max-w-[430px] overflow-y-auto rounded-t-3xl px-5 pb-6">
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

            {/* Respuesta del mensajero (publicada o en edición) */}
            {respondiendo ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  aria-label="Tu respuesta pública"
                  placeholder="Responde con respeto: tu respuesta es pública."
                  className="rounded-xl"
                  maxLength={600}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-full font-semibold"
                    disabled={respondPending}
                    onClick={() => setRespondiendo(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="h-10 flex-1 rounded-full font-bold"
                    disabled={respondPending || !texto.trim()}
                    onClick={enviar}
                  >
                    {respondPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
                    Publicar respuesta
                  </Button>
                </div>
                <p className="text-center text-[10.5px] text-muted-foreground">
                  {texto.length}/600 · el cliente recibe una notificación la primera vez.
                </p>
              </div>
            ) : (
              <>
                {abierta.response && (
                  <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-muted-foreground">Tu respuesta</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed">{abierta.response}</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full rounded-full font-semibold"
                  onClick={() => setRespondiendo(true)}
                >
                  <MessageSquareReply className="h-4 w-4" aria-hidden />
                  {abierta.response ? 'Editar tu respuesta' : 'Responder públicamente'}
                </Button>
              </>
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
