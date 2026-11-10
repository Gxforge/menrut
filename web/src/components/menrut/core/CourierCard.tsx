// MENRUT — Tarjeta de mensajero (pasaporte resumido) para resultados
'use client'

import { Heart, MessageSquare, ArrowRight, Bike } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useToggleFavorite } from '@/components/menrut/hooks'
import { Rating } from './Rating'
import { CoverageBadge, MatchTag, VerifiedSeal } from './StatusBadge'
import { formatCup, initials } from '@/lib/format'
import type { CourierSearchItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CourierCard({ courier }: { courier: CourierSearchItem }) {
  const navigate = useAppStore((s) => s.navigate)
  const selectCourier = useAppStore((s) => s.selectCourier)

  return (
    <article
      className={cn(
        'rounded-2xl border border-line bg-card p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)]',
        courier.matchReasons.some((r) => r.toLowerCase().includes('destacado')) && 'ring-1 ring-orange/40'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border border-line">
          {courier.avatarUrl ? (
            <AvatarImage src={courier.avatarUrl} alt={courier.fullName} />
          ) : null}
          <AvatarFallback className="bg-secondary font-display text-sm font-bold text-navy">
            {initials(courier.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-[15px] font-bold">{courier.fullName}</h3>
            {courier.isVerified && <VerifiedSeal compact />}
            {courier.isDemo && (
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
                Demo
              </span>
            )}
            <CoverageBadge type={courier.coverageType} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Rating value={courier.ratingAvg} count={courier.ratingCount} size="sm" />
            {courier.verifiedDeliveries > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bike className="h-3.5 w-3.5" aria-hidden />
                {courier.verifiedDeliveries} entregas verificadas
              </span>
            )}
          </div>
        </div>

        <FavoriteButton courierId={courier.courierId} initial={courier.isFavorite} />
      </div>

      {courier.matchReasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {courier.matchReasons.slice(0, 3).map((r) => (
            <MatchTag key={r} reason={r} />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary/70 px-3 py-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Vehículo</p>
          <p className="mt-0.5 truncate font-medium">{courier.vehicleSummary || '—'}</p>
        </div>
        <div className="rounded-xl bg-secondary/70 px-3 py-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Tarifa orientativa</p>
          <p className="mt-0.5 font-medium">{courier.feeCup !== null ? formatCup(courier.feeCup) : 'Por acordar'}</p>
        </div>
      </div>

      {courier.availabilityNote && (
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground" title={courier.availabilityNote}>
          🕐 {courier.availabilityNote}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          className="h-10 flex-1 rounded-full text-[13px] font-semibold"
          onClick={() => {
            selectCourier(courier.courierId)
            navigate('passport')
          }}
        >
          Ver pasaporte
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="secondary"
          className="h-10 flex-1 rounded-full text-[13px] font-semibold"
          onClick={() => {
            selectCourier(courier.courierId)
            navigate('passport')
          }}
        >
          <MessageSquare className="mr-1 h-4 w-4" aria-hidden />
          Contactar
        </Button>
      </div>
    </article>
  )
}

function FavoriteButton({ courierId, initial }: { courierId: string; initial: boolean }) {
  const { favorite, toggle } = useToggleFavorite(courierId, initial)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggle()
      }}
      aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-pressed={favorite}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all active:scale-90"
    >
      <Heart className={cn('h-5 w-5 transition-all', favorite && 'fill-danger text-danger scale-110')} aria-hidden />
    </button>
  )
}
