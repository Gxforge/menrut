// MENRUT — PassportScreen · diálogo de valoración (opinión con estrellas).
'use client'

import { Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function ReviewDialog({
  open,
  onOpenChange,
  firstName,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  firstName: string
  rating: number
  onRatingChange: (r: number) => void
  comment: string
  onCommentChange: (v: string) => void
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Valorar a {firstName}</DialogTitle>
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
          maxLength={600}
        />
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
            Publicar opinión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
