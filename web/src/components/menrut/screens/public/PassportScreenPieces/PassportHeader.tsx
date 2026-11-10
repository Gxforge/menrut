// MENRUT — PassportScreen · cabecera tipo pasaporte (navy, avatar y sellos).
'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Rating } from '@/components/menrut/core/Rating'
import { CoverageBadge, VerifiedSeal } from '@/components/menrut/core/StatusBadge'
import { formatRating, initials } from '@/lib/format'
import { Bike, Route as RouteIcon } from 'lucide-react'
import type { PassportDto } from '@/lib/types'

export function PassportHeader({ p }: { p: PassportDto }) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-navy via-[#0d3375] to-deep px-4 pb-9">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,194,255,0.22)_0%,rgba(11,43,96,0)_55%)]"
      />
      <RouteIcon
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-4 h-44 w-44 rotate-[18deg] text-white/[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-14 bottom-2 h-40 w-64 rounded-[50%] border-[14px] border-cyan/25 border-r-transparent border-b-transparent rotate-[-16deg]"
      />

      <div className="relative flex flex-col items-center pt-4 text-center">
        <Avatar className="h-24 w-24 border-[5px] border-white/15 shadow-[0_16px_40px_rgba(3,15,40,0.55)]">
          {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt={p.fullName} /> : null}
          <AvatarFallback className="bg-white/10 font-display text-2xl font-bold text-white">
            {initials(p.fullName)}
          </AvatarFallback>
        </Avatar>

        <h1 className="mt-3 max-w-[320px] font-display text-[24px] font-extrabold leading-tight text-white">
          {p.fullName}
        </h1>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {p.isVerified && <VerifiedSeal className="bg-white/15 text-white" />}
          {p.isDemo && (
            <span className="rounded-full bg-warn/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-200">
              Mensajero de demostración
            </span>
          )}
          <CoverageBadge type={p.coverageType} className="bg-white/15 text-white" />
        </div>
        {!p.isVerified && (
          <p className="mt-2 text-[11.5px] text-white/60">Identidad sin verificar por MENRUT</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Rating value={p.ratingAvg} showCount={false} />
          <span className="text-[13px] font-semibold text-white">{formatRating(p.ratingAvg)}</span>
          <span className="text-[12.5px] text-white/70">· {p.ratingCount} valoraciones</span>
        </div>
        {p.verifiedDeliveries > 0 && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            {p.verifiedDeliveries} entregas verificadas
          </p>
        )}
      </div>
    </header>
  )
}
