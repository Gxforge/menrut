// MENRUT — Piezas de AdminCouriersScreen: chip de verificación y tarjeta de
// mensajero (identidad, tipo, créditos y acciones de revisión).
'use client'

import { Eye, EyeOff, XCircle } from 'lucide-react'
import { formatDateTime, initials } from '@/lib/format'
import { CoverageBadge, PendingSeal, VerifiedSeal } from '@/components/menrut/core/StatusBadge'
import { Rating } from '@/components/menrut/core/Rating'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { AdminCourierDto, CoverageType } from '@/lib/types'

// Chip de estado de verificación (solo estados reales del backend)
function VerificationChip({ status }: { status: string }) {
  if (status === 'verified') return <VerifiedSeal compact />
  if (status === 'pending') return <PendingSeal />
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Rechazado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      Sin verificar
    </span>
  )
}

export function CourierCard({
  courier,
  coverageType,
  typeLoading,
  saving,
  onReview,
  onPassport,
}: {
  courier: AdminCourierDto
  coverageType: CoverageType | null
  typeLoading: boolean
  saving: boolean
  onReview: (c: AdminCourierDto, decision: 'verified' | 'rejected') => void
  onPassport: (courierId: string) => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border border-line">
          {courier.avatarUrl ? (
            <AvatarImage src={courier.avatarUrl} alt={`Foto de ${courier.fullName}`} />
          ) : null}
          <AvatarFallback className="bg-secondary text-[13px] font-bold text-navy">
            {initials(courier.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-[14.5px] font-bold leading-tight">
              {courier.fullName}
            </h3>
            {courier.isDemo ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Ejemplo
              </span>
            ) : null}
            {!courier.isPublic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <EyeOff className="h-3 w-3" aria-hidden />
                Oculto
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{courier.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VerificationChip status={courier.verificationStatus} />
            {coverageType ? (
              <CoverageBadge type={coverageType} />
            ) : typeLoading ? (
              <span
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                aria-label="Cargando tipo de mensajero"
              >
                Tipo ··
              </span>
            ) : null}
            <Rating value={courier.ratingAvg} count={courier.ratingCount} size="sm" />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-2.5 text-[11px]">
        <div>
          <p className="font-display text-[15px] font-bold leading-none">{courier.routesCount}</p>
          <p className="mt-1 leading-tight text-muted-foreground">Rutas</p>
        </div>
        <div>
          <p className="font-display text-[15px] font-bold leading-none">{courier.permanenceCredits}</p>
          <p className="mt-1 leading-tight text-muted-foreground">Créditos permanencia</p>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold leading-none">
            {courier.planName ?? '—'}
          </p>
          <p className="mt-1 truncate leading-tight text-muted-foreground">
            {courier.planExpiresAt ? `Vence ${formatDateTime(courier.planExpiresAt)}` : 'Sin plan activo'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {courier.verificationStatus === 'pending' ? (
          <>
            <Button
              size="sm"
              className="rounded-full bg-success text-white hover:bg-success/90"
              disabled={saving}
              onClick={() => onReview(courier, 'verified')}
            >
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full"
              disabled={saving}
              onClick={() => onReview(courier, 'rejected')}
            >
              Rechazar
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => onPassport(courier.courierId)}
        >
          <Eye className="h-4 w-4" aria-hidden />
          Ver pasaporte
        </Button>
      </div>
    </article>
  )
}
