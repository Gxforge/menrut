// MENRUT — Mi espacio · Dashboard del mensajero
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Eye, EyeOff, Route as RouteIcon, Star, PackageCheck, ChevronRight,
  CalendarClock, Sparkles, Settings, IdCard, ShieldCheck, Crown,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatRating, initials } from '@/lib/format'
import { Rating } from '@/components/menrut/core/Rating'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { CoverageBadge, PendingSeal, VerifiedSeal } from '@/components/menrut/core/StatusBadge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScreenId } from '@/lib/types'

function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

interface Acceso {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  screen: ScreenId
  onBefore?: () => void
}

export default function CourierHomeScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const selectCourier = useAppStore((s) => s.selectCourier)

  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })
  // La estimación de días restantes la calcula el servidor (wallet).
  const walletQ = useQuery({
    queryKey: ['courier-wallet'],
    queryFn: () => api.courierWallet(),
    enabled: !!session,
  })

  const dash = dashQ.data
  const wallet = walletQ.data

  // ── Carga ─────────────────────────────────────────────────────────────
  if (dashQ.isLoading) {
    return (
      <div className="px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mt-4 h-36 w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="mt-4"><ListSkeleton count={2} /></div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (dashQ.isError || !dash) {
    return (
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar tu espacio"
          hint="Revisa tu conexión. El dashboard sigue disponible aunque tu permanencia esté vencida."
          actionLabel="Reintentar"
          onAction={() => {
            void dashQ.refetch()
            void walletQ.refetch()
          }}
        />
      </div>
    )
  }

  const nombre = session?.fullName ?? 'Mensajero'
  const primerNombre = nombre.split(' ')[0] || 'Mensajero'
  const verificado = dash.verificationStatus === 'verified'
  const enRevision = dash.verificationStatus === 'pending'
  const esVerifEstadoVisible = verificado || enRevision

  const accesos: Acceso[] = [
    {
      icon: RouteIcon,
      label: 'Mis rutas',
      hint: dash.coverageType === 'zone'
        ? 'Tu zona de trabajo y tus trayectos'
        : 'Publica y gestiona tus recorridos',
      screen: 'courier-routes',
    },
    { icon: Star, label: 'Mi reputación', hint: 'Opiniones y entregas verificadas', screen: 'reputation' },
    { icon: Crown, label: 'Membresía', hint: 'Plan, permanencia y renovación', screen: 'membership' },
    { icon: Sparkles, label: 'Créditos y herramientas', hint: 'Saldo y funciones disponibles', screen: 'tools' },
    {
      icon: IdCard,
      label: 'Pasaporte público',
      hint: 'Ver tu perfil como lo ven los clientes',
      screen: 'passport',
      onBefore: () => selectCourier(dash.courierId),
    },
    { icon: Settings, label: 'Configuración', hint: 'Cuenta, avisos y seguridad', screen: 'settings' },
  ]

  return (
    <div className="px-4 pt-5 pb-8">
      {/* Cabecera: saludo + identidad */}
      <header className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-line">
          {session?.avatarUrl ? (
            <img src={session.avatarUrl} alt={`Avatar de ${nombre}`} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-blue/10 text-[14px] font-bold text-blue">
              {initials(nombre)}
            </span>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{saludo()},</p>
          <h1 className="screen-title truncate">{primerNombre}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <CoverageBadge type={dash.coverageType} />
            <span className="truncate text-[11.5px] text-muted-foreground">
              Tu espacio de trabajo en MENRUT
            </span>
          </div>
        </div>
      </header>

      {/* Estado de verificación */}
      <section className="mt-4" aria-label="Estado de verificación">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3">
          {verificado && <VerifiedSeal />}
          {enRevision && <PendingSeal />}
          {!esVerifEstadoVisible && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Sin verificar
            </span>
          )}
          {!verificado && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-9 rounded-full px-4"
              onClick={() => navigate('complete-profile')}
            >
              {enRevision ? 'Revisar estado' : 'Completar verificación'}
            </Button>
          )}
        </div>
      </section>

      {/* Tarjeta protagonista: visibilidad del pasaporte */}
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
              onClick={() => navigate('membership')}
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
              onClick={() => navigate('membership')}
            >
              Renovar permanencia
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </article>
        )}
      </section>

      {/* Métricas reales */}
      <section className="mt-5" aria-label="Resumen de actividad">
        <h2 className="section-title mb-2.5">Tu actividad</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue/10 text-blue">
              <RouteIcon className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.activeRoutes}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Rutas activas</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <CalendarClock className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.scheduledRoutes}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Rutas programadas</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/10 text-orange">
              <Star className="h-4 w-4" aria-hidden />
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <p className="font-display text-[22px] font-bold leading-none">{formatRating(dash.ratingAvg)}</p>
            </div>
            <div className="mt-1"><Rating value={dash.ratingAvg} count={dash.ratingCount} size="sm" /></div>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Valoración</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
              <PackageCheck className="h-4 w-4" aria-hidden />
            </span>
            <p className="mt-2 font-display text-[22px] font-bold leading-none">{dash.verifiedDeliveries}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Entregas verificadas</p>
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="mt-5" aria-label="Accesos rápidos">
        <h2 className="section-title mb-2.5">Accesos rápidos</h2>
        <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {accesos.map((a, i) => {
            const Icon = a.icon
            return (
              <button
                key={a.screen + i}
                type="button"
                onClick={() => {
                  a.onBefore?.()
                  navigate(a.screen)
                }}
                aria-label={a.label}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  'hover:bg-secondary/60 active:bg-secondary',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-tight">{a.label}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{a.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            )
          })}
        </nav>
      </section>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        Este panel sigue disponible aunque tu permanencia venza.
      </p>
    </div>
  )
}
