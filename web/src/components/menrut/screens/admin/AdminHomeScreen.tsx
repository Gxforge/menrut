// MENRUT — Administración · Inicio del panel (métricas reales)
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Bike,
  Clock3,
  Users,
  Route as RouteIcon,
  Receipt,
  Flag,
  FlaskConical,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const fmt = (n: number) => n.toLocaleString('es-CU')

// Tarjeta de métrica (dato real del overview; sin cifras inventadas)
function MetricCard({
  icon,
  label,
  value,
  hint,
  amber = false,
  ctaLabel,
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  amber?: boolean
  ctaLabel?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl',
            amber ? 'bg-orange/10 text-orange' : 'bg-secondary text-blue'
          )}
          aria-hidden
        >
          {icon}
        </span>
        {ctaLabel ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[10.5px] font-bold',
              amber ? 'text-orange' : 'text-blue'
            )}
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className={cn('mt-2.5 font-display text-[24px] font-bold leading-none', amber && 'text-orange')}>
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] font-medium leading-tight text-foreground/80">{label}</p>
      {hint ? (
        <p className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">{hint}</p>
      ) : null}
    </>
  )

  const cls = cn(
    'w-full rounded-2xl border bg-card p-3.5 text-left',
    amber ? 'border-orange/50 bg-orange/5' : 'border-line',
    onClick && 'transition-transform active:scale-95'
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    )
  }
  return <div className={cls}>{inner}</div>
}

function HomeSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Cargando métricas">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[112px] rounded-2xl" />
      ))}
    </div>
  )
}

export default function AdminHomeScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.adminOverview(),
    enabled: !!session,
  })

  return (
    <AdminScreen
      active="admin-home"
      title="Panel de administración"
      subtitle="Resumen real de la operación: verificaciones, comprobantes y reportes."
    >
      {isLoading ? (
        <HomeSkeleton />
      ) : isError || !data ? (
        <EmptyState
          icon={<LayoutDashboard className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar el panel"
          hint="Las métricas no están disponibles ahora mismo. Comprueba la conexión e inténtalo de nuevo; no mostramos cifras que no podamos verificar."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={<Bike className="h-4 w-4" aria-hidden />}
              label="Mensajeros totales"
              value={fmt(data.couriers.total)}
              hint={`${fmt(data.couriers.verified)} verificados · ${fmt(data.couriers.hidden)} ocultos`}
            />
            <MetricCard
              icon={<Clock3 className="h-4 w-4" aria-hidden />}
              label="Pendientes de verificar"
              value={fmt(data.couriers.pending)}
              amber={data.couriers.pending > 0}
              ctaLabel={data.couriers.pending > 0 ? 'Revisar' : undefined}
              onClick={data.couriers.pending > 0 ? () => navigate('admin-couriers') : undefined}
            />
            <MetricCard
              icon={<Users className="h-4 w-4" aria-hidden />}
              label="Clientes registrados"
              value={fmt(data.clients.total)}
            />
            <MetricCard
              icon={<RouteIcon className="h-4 w-4" aria-hidden />}
              label="Rutas activas"
              value={fmt(data.routes.active)}
              hint={`${fmt(data.routes.scheduled)} programadas`}
            />
            <MetricCard
              icon={<Receipt className="h-4 w-4" aria-hidden />}
              label="Comprobantes pendientes"
              value={fmt(data.payments.pending)}
              hint={`${fmt(data.payments.approvedThisMonth)} aprobados este mes`}
              amber={data.payments.pending > 0}
              ctaLabel="Revisar"
              onClick={() => navigate('admin-payments')}
            />
            <MetricCard
              icon={<Flag className="h-4 w-4" aria-hidden />}
              label="Reportes abiertos"
              value={fmt(data.reports.open)}
              amber={data.reports.open > 0}
              ctaLabel="Revisar"
              onClick={() => navigate('admin-moderation')}
            />
          </div>

          {data.demoCouriers > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-secondary/60 p-4">
              <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold">
                  {fmt(data.demoCouriers)} mensajeros de ejemplo (demo)
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  Datos semilla para desarrollo.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AdminScreen>
  )
}
