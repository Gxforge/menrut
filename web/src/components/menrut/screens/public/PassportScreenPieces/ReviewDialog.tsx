// MENRUT — PassportScreen · diálogo de valoración (opinión con estrellas).
'use client'

import { Loader2, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function ReviewDialog({
  open,
  onOpenChange,
  firstName,
  editing = false,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  canLinkDelivery,
  linkDelivery,
  onLinkDeliveryChange,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  firstName: string
  editing?: boolean
  rating: number
  onRatingChange: (r: number) => void
  comment: string
  onCommentChange: (v: string) => void
  canLinkDelivery: boolean
  linkDelivery: boolean
  onLinkDeliveryChange: (v: boolean) => void
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Tu valoración de ${firstName}` : `Valorar a ${firstName}`}</DialogTitle>
          <DialogDescription>
            Tu opinión ayuda a otros clientes a elegir bien. Puedes actualizarla cuando quieras.
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex justify-center gap-2"
          role="radiogroup"
          aria-label="Puntuación de 1 a 5 estrellas"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`}
              onClick={() => onRatingChange(i)}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  i <= rating ? 'fill-orange text-orange' : 'fill-muted text-muted-foreground/30',
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          placeholder="Comentario (opcional): ¿cómo fue tu experiencia?"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          aria-label="Comentario sobre el mensajero"
          className="rounded-xl"
          maxLength={120}
        />
        {canLinkDelivery && (
          <button
            type="button"
            role="switch"
            aria-checked={linkDelivery}
            onClick={() => onLinkDeliveryChange(!linkDelivery)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[12.5px] transition-colors',
              linkDelivery
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-line bg-card text-muted-foreground hover:bg-secondary/50',
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 font-semibold">
              Marcar como entrega verificada (código OTP usado)
            </span>
            <span
              aria-hidden
              className={cn(
                'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                linkDelivery ? 'bg-success' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  linkDelivery && 'translate-x-4',
                )}
              />
            </span>
          </button>
        )}
        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-full font-semibold"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            className="h-11 flex-1 rounded-full font-bold"
            disabled={rating < 1 || pending}
            onClick={onSubmit}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
            {editing ? 'Guardar cambios' : 'Publicar opinión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
