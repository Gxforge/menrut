// MENRUT — MembershipScreen · Tarjeta de estado de la membresía: plan
// actual, créditos de permanencia y vencimiento.
'use client'

import { Crown, Hourglass, ShieldCheck } from 'lucide-react'
import { daysUntil, formatDateTime } from '@/lib/format'
import type { WalletDto } from '@/lib/types'

export function MembershipStatusCard({ wallet }: { wallet: WalletDto }) {
  const restantes = daysUntil(wallet.planExpiresAt)
  const diasRestantesTexto =
    restantes === null ? null :
    restantes <= 0 ? 'Vence hoy' :
    `Tiempo restante: ${restantes} ${restantes === 1 ? 'día' : 'días'}`

  return (
    <section aria-label="Estado de tu membresía" className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue">
          <Crown className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Plan actual
          </p>
          <p className="truncate font-display text-[17px] font-bold leading-tight">
            {wallet.planName ?? 'Sin membresía activa'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Tu pasaporte es visible mientras tengas permanencia.
      </p>

      {/* Créditos de permanencia */}
      <div className="mt-4 rounded-xl bg-secondary/70 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-blue" aria-hidden />
            Créditos de permanencia
          </span>
          <span className="font-display text-[24px] font-bold leading-none text-foreground">
            {wallet.permanenceCredits}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {wallet.permanenceDaysLeft > 0
            ? `Aproximadamente ${wallet.permanenceDaysLeft} ${wallet.permanenceDaysLeft === 1 ? 'día' : 'días'} de visibilidad estimados.`
            : 'Ahora mismo no sostienen visibilidad. Renueva para volver a las búsquedas.'}
        </p>
      </div>

      {/* Vencimiento del plan */}
      {wallet.planExpiresAt && wallet.hasActiveMembership && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue/5 px-4 py-3">
          <Hourglass className="h-4 w-4 shrink-0 text-blue" aria-hidden />
          <p className="text-[12px] leading-relaxed text-foreground">
            Vence el {formatDateTime(wallet.planExpiresAt)}.
            {diasRestantesTexto && (
              <>
                <br />
                <span className="font-semibold text-blue">{diasRestantesTexto}.</span>
              </>
            )}
          </p>
        </div>
      )}
    </section>
  )
}
