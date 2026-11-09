// MENRUT — Notificaciones
// Lista con icono por categoría, tiempo relativo y punto azul si no leída.
// Tap → marcar leída (optimista). Preferencias por categoría guardadas SOLO en
// localStorage (no se simula sincronización con la cuenta).
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bell, Crown, MessageSquare, RefreshCw, Route as RouteIcon, ShieldCheck, Star,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { EmptyState, NotificationsEmpty } from '@/components/menrut/core/EmptyState'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NotificationDto } from '@/lib/types'

// ─── Categorías (icono + etiqueta) ──────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  ruta: { label: 'Rutas', icon: RouteIcon, cls: 'bg-blue/10 text-blue' },
  mensaje: { label: 'Mensajes', icon: MessageSquare, cls: 'bg-cyan/10 text-cyan' },
  valoracion: { label: 'Valoraciones', icon: Star, cls: 'bg-orange/10 text-orange' },
  membresia: { label: 'Membresía', icon: Crown, cls: 'bg-success/10 text-success' },
  admin: { label: 'Administración', icon: ShieldCheck, cls: 'bg-navy/10 text-navy' },
  general: { label: 'General', icon: Bell, cls: 'bg-muted text-muted-foreground' },
}

function metaFor(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.general
}

// ─── Preferencias locales (sin sincronización simulada) ─────────────────────

const LS_PREFS = 'menrut-notification-prefs'

interface NotifPrefs {
  ruta: boolean
  mensaje: boolean
  valoracion: boolean
  membresia: boolean
  general: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  ruta: true,
  mensaje: true,
  valoracion: true,
  membresia: true,
  general: true,
}

// Frases para la sección de preferencias (no simple minúscula: «general» leería raro)
const PREF_LABELS: Record<keyof NotifPrefs, string> = {
  ruta: 'Avisos de rutas',
  mensaje: 'Avisos de mensajes',
  valoracion: 'Avisos de valoraciones',
  membresia: 'Avisos de membresía',
  general: 'Novedades generales',
}

function loadPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(LS_PREFS)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const session = useAppStore((s) => s.session)
  const qc = useQueryClient()
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs)

  const notifications = useQuery({
    queryKey: ['notifications', session?.id],
    queryFn: () => api.notifications(),
    enabled: !!session,
  })

  function togglePref(key: keyof NotifPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify(next))
    } catch {
      // Sin almacenamiento: la preferencia vive solo en esta sesión.
    }
  }

  function markRead(n: NotificationDto) {
    if (n.readAt !== null) return
    const key = ['notifications', session?.id]
    const prev = qc.getQueryData<{ notifications: NotificationDto[] }>(key)
    // Optimista: punto azul fuera y contador actualizado al instante.
    qc.setQueryData<{ notifications: NotificationDto[] }>(key, (d) =>
      d
        ? {
            notifications: d.notifications.map((x) =>
              x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x
            ),
          }
        : d
    )
    api.markNotificationRead(n.id).catch(() => {
      qc.setQueryData(key, prev)
      toast.error('No se pudo marcar como leída.')
    })
  }

  const list = notifications.data?.notifications ?? []
  const unreadCount = list.filter((n) => n.readAt === null).length

  return (
    <div className="pb-10">
      <TabHeader
        title="Notificaciones"
        subtitle="Novedades de tu actividad"
        right={
          unreadCount > 0 ? (
            <span
              aria-label={`${unreadCount} notificaciones sin leer`}
              className="flex h-7 min-w-7 items-center justify-center rounded-full bg-danger px-2 text-[12px] font-bold text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : undefined
        }
      />

      <div className="space-y-4 px-4 pt-4">
        {/* Preferencias (solo locales, con nota honesta) */}
        <section aria-label="Preferencias de notificaciones" className="rounded-2xl border border-line bg-card p-4">
          <h2 className="section-title">Preferencias</h2>
          <ul className="mt-2 divide-y divide-line/60">
            {(Object.keys(DEFAULT_PREFS) as (keyof NotifPrefs)[]).map((key) => {
              const meta = metaFor(key)
              const Icon = meta.icon
              const prefLabel = PREF_LABELS[key]
              return (
                <li key={key} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', meta.cls)}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="truncate text-[13.5px] font-medium">{prefLabel}</span>
                  </span>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={() => togglePref(key)}
                    aria-label={prefLabel}
                  />
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
            Se guardan en este dispositivo. Próximamente se sincronizarán con tu cuenta.
          </p>
        </section>

        {/* Lista de notificaciones */}
        {notifications.isLoading ? (
          <div className="space-y-2.5" aria-busy="true" aria-label="Cargando notificaciones">
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        ) : notifications.isError ? (
          <EmptyState
            icon={<RefreshCw className="h-8 w-8" aria-hidden />}
            title="No pudimos cargar tus notificaciones"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => notifications.refetch()}
          />
        ) : list.length === 0 ? (
          <NotificationsEmpty />
        ) : (
          <ul className="space-y-2.5" aria-label="Notificaciones">
            {list.map((n) => {
              const meta = metaFor(n.category)
              const Icon = meta.icon
              const unread = n.readAt === null
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    aria-label={`${unread ? 'Marcar como leída: ' : ''}${n.title}`}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all',
                      'hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]',
                      unread ? 'border-blue/25 bg-card' : 'border-line bg-card/60'
                    )}
                  >
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.cls)}>
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold leading-tight">{n.title}</span>
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue" aria-label="No leída" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{n.body}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[9.5px] font-bold text-navy">
                          {meta.label}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}
