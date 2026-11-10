// MENRUT — SettingsScreen · Sección «Visibilidad y disponibilidad»:
// estado real de visibilidad del pasaporte según la permanencia.
'use client'

import { ChevronRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourierDashboardDto } from '@/lib/types'

interface VisibilityCardProps {
  isLoading: boolean
  isError: boolean
  dash: CourierDashboardDto | undefined
  onRetry: () => void
  onMembership: () => void
}

export function VisibilityCard({ isLoading, isError, dash, onRetry, onMembership }: VisibilityCardProps) {
  return (
    <section className="mt-5" aria-label="Visibilidad y disponibilidad">
      <h2 className="section-title mb-2.5">Visibilidad y disponibilidad</h2>
      <div className="rounded-2xl border border-line bg-card p-4">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        ) : isError || !dash ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-muted-foreground">No se pudo cargar el estado.</p>
            <Button variant="outline" size="sm" className="h-9 rounded-full" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : dash.isPublic ? (
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <Eye className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight text-success">
                Visible en las búsquedas
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Tu pasaporte es visible mientras tengas permanencia.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
              <EyeOff className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-tight text-orange">
                Oculto en las búsquedas
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Tu perfil no está visible. Puedes seguir entrando para gestionar tu cuenta o renovar la permanencia.
              </p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-10 rounded-full px-4"
          onClick={onMembership}
        >
          Gestionar permanencia
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </section>
  )
}
