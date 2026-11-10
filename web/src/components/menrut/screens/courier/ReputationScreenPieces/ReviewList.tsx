// MENRUT — ReputationScreen · Lista de tarjetas de opinión de clientes.
'use client'

import { MessageSquareQuote, ShieldCheck, Star } from 'lucide-react'
import { Rating } from '@/components/menrut/core/Rating'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { initials, timeAgo } from '@/lib/format'
import type { ReviewDto } from '@/lib/types'

interface ReviewListProps {
  reviews: ReviewDto[]
  listadoFiltrado: ReviewDto[]
  onOpen: (r: ReviewDto) => void
}

export function ReviewList({ reviews, listadoFiltrado, onOpen }: ReviewListProps) {
  return (
    <>
      {reviews.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Star className="h-8 w-8" aria-hidden />}
            title="Todavía no tienes opiniones"
            hint="Se acumularán con tus entregas."
          />
        </div>
      ) : listadoFiltrado.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          No hay opiniones en este grupo.
        </p>
      ) : (
        <section className="mt-4 space-y-3" aria-label="Opiniones de clientes">
          {listadoFiltrado.map((r) => (
            <article
              key={r.id}
              onClick={() => onOpen(r)}
              className="cursor-pointer rounded-2xl border border-line bg-card p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]"
            >
              <header className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[12px] font-bold text-blue"
                >
                  {initials(r.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold leading-tight">{r.authorName}</p>
                  <Rating value={r.rating} showCount={false} size="sm" />
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </header>

              {r.comment && (
                <p className="mt-2.5 text-[13px] leading-relaxed text-foreground">{r.comment}</p>
              )}

              <footer className="mt-3 flex flex-wrap items-center gap-2">
                {r.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    Entrega verificada
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Sin verificar
                  </span>
                )}
              </footer>

              {r.response && (
                <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    <MessageSquareQuote className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Tu respuesta
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">{r.response}</p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  )
}
