// MENRUT — CourierHomeScreen · Tarjeta protagonista: visibilidad del
// pasaporte según la permanencia (visible / oculto).
'use client'

import { ChevronRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourierDashboardDto, WalletDto } from '@/lib/types'

interface VisibilityCardProps {
  dash: CourierDashboardDto
  wallet: WalletDto | undefined
  onMembership: () => void
}

export function VisibilityCard({ dash, wallet, onMembership }: VisibilityCardProps) {
  return (
    <section className="mt-4" aria-label="Estado de visibilidad">
      {dash.isPublic ? (
        <article className="rounded-2xl border border-success/25 bg-success/10 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
              <Eye className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-success">
              Perfil visible
            </p>
          </div>
          <h2 className="mt-2.5 font-display text-[16px] font-bold leading-snug text-foreground">
            Tu pasaporte es visible en las búsquedas
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Te quedan <strong className="text-foreground">{dash.wallet.permanenceCredits}</strong> créditos de permanencia
            {wallet && wallet.permanenceDaysLeft > 0 && (
              <> · aproximadamente <strong className="text-foreground">{wallet.permanenceDaysLeft}</strong> día
              {wallet.permanenceDaysLeft === 1 ? '' : 's'} de visibilidad</>
            )}
            {dash.wallet.planName && <> · plan <strong className="text-foreground">{dash.wallet.planName}</strong></>}
            .
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-10 rounded-full px-4"
            onClick={onMembership}
          >
            Ver permanencia
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </article>
      ) : (
        <article className="rounded-2xl border border-orange/30 bg-orange/10 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange/15 text-orange">
              <EyeOff className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-orange">
              Perfil oculto
            </p>
          </div>
          <h2 className="mt-2.5 font-display text-[16px] font-bold leading-snug text-foreground">
            Tu perfil no está visible en las búsquedas
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Puedes seguir entrando para gestionar tu cuenta o renovar la permanencia.
            Nada se borra: tus rutas, fotos y reputación se conservan.
          </p>
          <Button
            size="sm"
            className="mt-3 h-10 rounded-full px-5"
            onClick={onMembership}
          >
            Renovar permanencia
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </article>
      )}
    </section>
  )
}
