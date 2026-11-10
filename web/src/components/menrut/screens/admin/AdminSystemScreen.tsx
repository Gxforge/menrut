// MENRUT — Administración · Estado del sistema (datos en vivo)
'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Database,
  Users,
  Bike,
  Route as RouteIcon,
  MessageSquare,
  Bell,
  ScrollText,
  MapPin,
  Info,
  Activity,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const fmt = (n: number) => n.toLocaleString('es-CU')

function CounterCard({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: ReactNode
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-card p-3.5',
        wide && 'col-span-2 flex items-center gap-3'
      )}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-blue"
        aria-hidden
      >
        {icon}
      </span>
      <div className={cn(!wide && 'mt-2.5')}>
        <p className="font-display text-[22px] font-bold leading-none">{value}</p>
        <p className="mt-1 text-[11.5px] font-medium leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function SystemSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando estado del sistema">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  )
}

export default function AdminSystemScreen() {
  const session = useAppStore((s) => s.session)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-system'],
    queryFn: () => api.adminSystem(),
    enabled: !!session,
  })

  // demoShare puede llegar como fracción (0-1) o porcentaje (0-100)
  const demoShare = data
    ? Math.max(0, Math.min(100, Math.round(data.demoShare <= 1 ? data.demoShare * 100 : data.demoShare)))
    : 0

  return (
    <AdminScreen
      active="admin-system"
      title="Estado del sistema"
      subtitle="Salud de la base de datos y contadores reales de la operación."
    >
      {isLoading ? (
        <SystemSkeleton />
      ) : isError || !data ? (
        <EmptyState
          icon={<Activity className="h-8 w-8" aria-hidden />}
          title="No se pudo consultar el estado del sistema"
          hint="El diagnóstico en vivo no está disponible ahora mismo. Comprueba la conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : (
        <div className="space-y-3">
          {/* Estado de la base de datos */}
          <div
            className={cn(
              'rounded-2xl border bg-card p-4',
              data.databaseOk ? 'border-success/40' : 'border-danger/50'
            )}
            role="status"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full rounded-full opacity-60',
                    data.databaseOk ? 'animate-ping bg-success' : 'bg-danger'
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex h-3 w-3 rounded-full',
                    data.databaseOk ? 'bg-success' : 'bg-danger'
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-bold leading-tight">Base de datos</p>
                <p
                  className={cn(
                    'text-[12.5px] font-semibold',
                    data.databaseOk ? 'text-success' : 'text-danger'
                  )}
                >
                  {data.databaseOk ? 'Operativa' : 'No disponible'}
                </p>
              </div>
              <Database
                className={cn('h-5 w-5', data.databaseOk ? 'text-success' : 'text-danger')}
                aria-hidden
              />
            </div>
          </div>

          {/* Contadores reales */}
          <div className="grid grid-cols-2 gap-3">
            <CounterCard icon={<Users className="h-4 w-4" aria-hidden />} label="Usuarios" value={fmt(data.users)} />
            <CounterCard icon={<Bike className="h-4 w-4" aria-hidden />} label="Mensajeros" value={fmt(data.couriers)} />
            <CounterCard icon={<RouteIcon className="h-4 w-4" aria-hidden />} label="Rutas" value={fmt(data.routes)} />
            <CounterCard
              icon={<MessageSquare className="h-4 w-4" aria-hidden />}
              label="Conversaciones"
              value={fmt(data.conversations)}
            />
            <CounterCard
              icon={<Bell className="h-4 w-4" aria-hidden />}
              label="Notificaciones"
              value={fmt(data.notifications)}
            />
            <CounterCard
              icon={<ScrollText className="h-4 w-4" aria-hidden />}
              label="Eventos de auditoría"
              value={fmt(data.auditEvents)}
            />
            <CounterCard
              icon={<MapPin className="h-4 w-4" aria-hidden />}
              label="Municipios del catálogo"
              value={fmt(data.territories)}
              wide
            />
          </div>

          {/* Proporción de mensajeros de ejemplo */}
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold">Mensajeros de ejemplo</p>
              <p className="font-display text-[14px] font-bold text-blue">{demoShare}%</p>
            </div>
            <Progress value={demoShare} className="mt-2.5 h-2" aria-label={`${demoShare}% de mensajeros de ejemplo`} />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Proporción de mensajeros de ejemplo (demo) sobre el total de mensajeros.
            </p>
          </div>

          {/* Reconciliación programada (cada 6 h + cron externo) */}
          {data.reconciliation && (
            <div className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <RefreshCw className={cn('h-4 w-4', data.reconciliation.ok ? 'text-success' : 'text-orange')} aria-hidden />
                  Reconciliación programada
                </p>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold',
                    data.reconciliation.ok ? 'bg-success/10 text-success' : 'bg-orange/10 text-orange',
                  )}
                >
                  {data.reconciliation.ok ? 'OK' : 'Con incidencias'}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Última corrida: <strong>{formatDateTime(data.reconciliation.startedAt)}</strong> ·
                perfiles sincronizados: {data.reconciliation.synced} · reservas liberadas:{' '}
                {data.reconciliation.reservationsReleased} · reparaciones:{' '}
                {data.reconciliation.orphansRepaired}.
              </p>
              {!data.reconciliation.ok && (
                <p className="mt-1 text-[11.5px] text-orange">{data.reconciliation.detail}</p>
              )}
            </div>
          )}

          {/* Nota de honestidad */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-secondary/60 p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Métricas consultadas en vivo a la base de datos operativa.
            </p>
          </div>
        </div>
      )}
    </AdminScreen>
  )
}
