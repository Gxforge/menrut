// MENRUT — PassportScreen · opiniones y valoraciones del mensajero.
'use client'

import { ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Rating } from '@/components/menrut/core/Rating'
import { timeAgo } from '@/lib/format'
import type { PassportDto } from '@/lib/types'

export function ReviewsSection({
  reviews,
  totalReviews,
  ratingCount,
  canRate,
  ownerFirstName,
  showAllToggle,
  onShowAll,
  onRate,
}: {
  reviews: PassportDto['reviews']
  totalReviews: number
  ratingCount: number
  canRate: boolean
  ownerFirstName: string
  showAllToggle: boolean
  onShowAll: () => void
  onRate: () => void
}) {
  return (
    <section aria-labelledby="pp-reviews">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="pp-reviews" className="section-title">Opiniones</h2>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] text-muted-foreground">{ratingCount} en total</span>
          {canRate && (
            <button
              type="button"
              onClick={onRate}
              className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-3 py-1.5 text-[12px] font-bold text-orange ring-1 ring-orange/25 transition-transform active:scale-95"
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              Valorar
            </button>
          )}
        </div>
      </div>
      {totalReviews > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13.5px] font-semibold">{review.authorName}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(review.createdAt)}
                </span>
              </div>
              <div className="mt-1">
                <Rating value={review.rating} showCount={false} size="sm" />
              </div>
              {review.comment && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {review.comment}
                </p>
              )}
              {review.isVerified && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10.5px] font-semibold text-success">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Entrega verificada
                </span>
              )}
              {review.response && (
                <div className="mt-3 rounded-xl bg-secondary/70 p-3">
                  <p className="text-[11px] font-semibold text-navy">
                    Respuesta de {ownerFirstName}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {review.response}
                  </p>
                </div>
              )}
            </article>
          ))}
          {showAllToggle && (
            <Button
              variant="outline"
              className="h-11 w-full rounded-full text-[13px] font-semibold"
              onClick={onShowAll}
            >
              Ver todas las opiniones ({totalReviews})
            </Button>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
          Todavía no hay opiniones publicadas para este mensajero.
        </p>
      )}
    </section>
  )
}
