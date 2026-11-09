// MENRUT — Valoración con estrellas
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRating } from '@/lib/format'

export function Rating({
  value,
  count,
  size = 'md',
  showCount = true,
  className,
}: {
  value: number
  count?: number
  size?: 'sm' | 'md'
  showCount?: boolean
  className?: string
}) {
  const star = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const filled = value >= 4.5 ? 5 : value >= 3.5 ? 4 : value >= 2.5 ? 3 : value >= 1.5 ? 2 : value > 0 ? 1 : 0
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`Valoración ${formatRating(value)} de 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(star, i <= filled ? 'fill-orange text-orange' : 'fill-muted text-muted-foreground/30')}
            aria-hidden
          />
        ))}
      </span>
      <span className={cn('font-semibold', size === 'sm' ? 'text-xs' : 'text-sm')}>{formatRating(value)}</span>
      {showCount && count !== undefined && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-[10.5px]' : 'text-xs')}>
          ({count})
        </span>
      )}
    </span>
  )
}
