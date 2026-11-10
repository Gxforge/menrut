// MENRUT — PassportScreen · botón de favoritos con estado optimista.
'use client'

import { Heart, Loader2 } from 'lucide-react'
import { useToggleFavorite } from '@/components/menrut/hooks'
import { cn } from '@/lib/utils'

export function SaveButton({ courierId, initial }: { courierId: string; initial: boolean }) {
  const { favorite, toggle, isPending } = useToggleFavorite(courierId, initial)
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-pressed={favorite}
      className={cn(
        'flex h-12 w-[76px] shrink-0 items-center justify-center gap-1.5 rounded-full border transition-all active:scale-95',
        favorite
          ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-line bg-card text-muted-foreground hover:border-danger/30 hover:text-danger'
      )}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <>
          <Heart className={cn('h-5 w-5', favorite && 'fill-danger')} aria-hidden />
          <span className="text-[12.5px] font-bold">{favorite ? 'Guardado' : 'Guardar'}</span>
        </>
      )}
    </button>
  )
}
