// MENRUT — ReputationScreen · Puntuación global con la distribución
// de valoraciones de 5 a 1 estrella.
'use client'

import { Star } from 'lucide-react'
import { Rating } from '@/components/menrut/core/Rating'
import { cn } from '@/lib/utils'
import { formatRating } from '@/lib/format'

interface RatingSummaryProps {
  ratingAvg: number
  ratingCount: number
  verifiedDeliveries: number
  distribution: Record<string, number>
  totalReviews: number
  miNivel: number
}

export function RatingSummary({
  ratingAvg,
  ratingCount,
  verifiedDeliveries,
  distribution,
  totalReviews,
  miNivel,
}: RatingSummaryProps) {
  return (
    <section aria-label="Puntuación global" className="rounded-2xl border border-line bg-card p-5 text-center">
      <p className="font-display text-[40px] font-bold leading-none">{formatRating(ratingAvg)}</p>
      <div className="mt-2 flex justify-center">
        <Rating value={ratingAvg} showCount={false} />
      </div>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground">
        {ratingCount} {ratingCount === 1 ? 'opinión' : 'opiniones'} · {verifiedDeliveries}{' '}
        {verifiedDeliveries === 1 ? 'entrega verificada' : 'entregas verificadas'}
      </p>

      {/* Distribución 5→1. El backend entrega conteos por estrella;
          aquí se calcula el porcentaje sobre el total de opiniones. */}
      <div className="mt-4 space-y-2" aria-label="Distribución de valoraciones">
        {[5, 4, 3, 2, 1].map((n) => {
          const conteo = distribution[String(n)] ?? 0
          const pct = totalReviews > 0 ? Math.round((conteo / totalReviews) * 100) : 0
          const esMiNivel = n === miNivel && ratingAvg > 0
          return (
            <div key={n} className="flex items-center gap-2.5">
              <span className="w-8 shrink-0 text-[11.5px] font-semibold text-muted-foreground">
                {n} <Star className="inline h-3 w-3 fill-orange text-orange" aria-hidden />
              </span>
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label={`${pct}% de las opiniones (${conteo}) tienen ${n} estrellas`}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn('h-full rounded-full', esMiNivel ? 'bg-blue' : 'bg-blue/40')}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[11.5px] text-muted-foreground">{pct}%</span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        La barra resaltada corresponde a tu promedio actual.
      </p>
    </section>
  )
}
