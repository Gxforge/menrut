// MENRUT — Mi espacio · Dashboard del mensajero
// (Estados previos, tarjeta de visibilidad, métricas y accesos rápidos
// viven en CourierHomeScreenPieces/.)
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Route as RouteIcon, Star, Sparkles, Settings, IdCard, ShieldCheck, Crown, PackageCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { initials } from '@/lib/format'
import { CoverageBadge, PendingSeal, VerifiedSeal } from '@/components/menrut/core/StatusBadge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { HomeError, HomeLoading, StaleNotice } from './CourierHomeScreenPieces/HomeGuards'
import { VisibilityCard } from './CourierHomeScreenPieces/VisibilityCard'
import { ActivityMetrics } from './CourierHomeScreenPieces/ActivityMetrics'
import { QuickAccess } from './CourierHomeScreenPieces/QuickAccess'
import { saludo, type Acceso } from './CourierHomeScreenPieces/helpers'

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
    return <HomeLoading />
  }

  // ── Error ─────────────────────────────────────────────────────────────
  // Con datos guardados (caché del dispositivo) se muestran aunque la última petición haya fallado.
  if (!dash) {
    return (
      <HomeError
        onRetry={() => {
          void dashQ.refetch()
          void walletQ.refetch()
        }}
      />
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
    { icon: PackageCheck, label: 'Entregas verificadas', hint: 'Verifica con el código OTP del cliente', screen: 'courier-deliveries' },
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
      {dashQ.isError && <StaleNotice />}
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
      <VisibilityCard
        dash={dash}
        wallet={wallet}
        onMembership={() => navigate('membership')}
      />

      {/* Métricas reales */}
      <ActivityMetrics dash={dash} />

      {/* Accesos rápidos */}
      <QuickAccess accesos={accesos} onNavigate={navigate} />

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        Este panel sigue disponible aunque tu permanencia venza.
      </p>
    </div>
  )
}
