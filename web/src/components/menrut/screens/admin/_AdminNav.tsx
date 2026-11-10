// MENRUT — Navegación y cabecera del panel de administración
// Archivo interno (prefijo _) — NO es una pantalla enrutable.
// El panel admin no usa BottomNav: cada pantalla incorpora AdminHeader + AdminNav
// mediante el envoltorio <AdminScreen>.
//
// Jerarquía de roles (visibilidad en cliente; los permisos reales los aplica
// el backend): propietario (todo) > administrador (todo el panel) > moderador
// (SOLO Moderación). Las claves de pago (payment_*) solo las edita el
// propietario (protegido en el backend).
'use client'

import { useState } from 'react'
import { Route as RouteIcon, LogOut, Loader2, Crown, Shield, ShieldCheck, Lock } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { signOutSupabase } from '@/lib/auth'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { cn } from '@/lib/utils'
import type { Role, ScreenId } from '@/lib/types'

// Secciones del panel (orden fijo de producto)
const ADMIN_TABS: { screen: ScreenId; label: string }[] = [
  { screen: 'admin-home', label: 'Inicio' },
  { screen: 'admin-couriers', label: 'Mensajeros' },
  { screen: 'admin-businesses', label: 'Cuentas' },
  { screen: 'admin-payments', label: 'Pagos' },
  { screen: 'admin-tools', label: 'Planes/Herram.' },
  { screen: 'admin-moderation', label: 'Moderación' },
  { screen: 'admin-settings', label: 'Config' },
  { screen: 'admin-databases', label: 'Base de datos' },
  { screen: 'admin-system', label: 'Sistema' },
]

type StaffRole = 'owner' | 'admin' | 'moderator'

// Secciones visibles por rol (el moderador solo ve Moderación)
const ROLE_TABS: Record<StaffRole, readonly ScreenId[]> = {
  owner: ADMIN_TABS.map((t) => t.screen),
  admin: ADMIN_TABS.map((t) => t.screen),
  moderator: ['admin-moderation'],
}

function isStaffRole(role: string | undefined | null): role is StaffRole {
  return role === 'owner' || role === 'admin' || role === 'moderator'
}

function tabsForRole(role: string | undefined | null): { screen: ScreenId; label: string }[] {
  if (!isStaffRole(role)) return []
  return ADMIN_TABS.filter((t) => ROLE_TABS[role].includes(t.screen))
}

// Insignia de rol del equipo (panel admin y perfil). null para roles no staff.
export function RoleBadge({ role, onDark = false }: { role: Role; onDark?: boolean }) {
  if (role === 'owner') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1',
          onDark ? 'bg-orange/20 text-orange ring-orange/40' : 'bg-orange/10 text-orange ring-orange/30',
        )}
      >
        <Crown className="h-3.5 w-3.5" aria-hidden />
        Propietario
      </span>
    )
  }
  if (role === 'admin') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1',
          onDark ? 'bg-cyan/15 text-cyan ring-cyan/40' : 'bg-blue/10 text-blue ring-blue/30',
        )}
      >
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Administrador
      </span>
    )
  }
  if (role === 'moderator') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1',
          onDark ? 'bg-white/10 text-white/85 ring-white/20' : 'bg-navy/10 text-navy ring-navy/20',
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Moderador
      </span>
    )
  }
  return null
}

// Cabecera de marca del panel: logo, nombre del administrador, rol y salir
export function AdminHeader() {
  const session = useAppStore((s) => s.session)
  const logout = useAppStore((s) => s.logout)
  const [leaving, setLeaving] = useState(false)

  const handleLogout = async () => {
    setLeaving(true)
    try {
      await signOutSupabase()
    } catch {
      // la sesión local se cierra igualmente
    } finally {
      logout()
    }
  }

  return (
    <header className="bg-gradient-to-r from-deep via-navy to-deep px-4 pb-4 pt-safe">
      <div className="flex items-center gap-3 pt-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue/15 ring-1 ring-cyan/30"
          aria-hidden
        >
          <RouteIcon className="h-5 w-5 text-cyan" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold leading-tight text-white">
            MENRUT · Administración
          </p>
          <p className="truncate text-[11.5px] leading-tight text-white/55">
            {session ? `${session.fullName} · ${session.email}` : 'Panel de administración'}
          </p>
          {session ? (
            <div className="mt-1.5">
              <RoleBadge role={session.role} onDark />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={leaving}
          aria-label="Cerrar sesión"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85 ring-1 ring-white/15 transition-all hover:bg-white/15 active:scale-95 disabled:opacity-60"
        >
          {leaving ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          )}
        </button>
      </div>
    </header>
  )
}

// Barra horizontal de secciones del panel (scrollable, fija al hacer scroll).
// Se filtra por rol: el moderador solo ve Moderación.
export function AdminNav({ active }: { active: ScreenId }) {
  const navigate = useAppStore((s) => s.navigate)
  const role = useAppStore((s) => s.session?.role)
  const tabs = tabsForRole(role)

  return (
    <nav
      aria-label="Secciones de administración"
      className="sticky top-0 z-30 border-b border-line/70 bg-card/95 backdrop-blur-md"
    >
      <div className="nice-scroll flex gap-1.5 overflow-x-auto px-3 py-2">
        {tabs.map((tab) => {
          const isActive = tab.screen === active
          return (
            <button
              key={tab.screen}
              type="button"
              onClick={() => navigate(tab.screen)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95',
                isActive
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Envoltorio común de las pantallas del panel: cabecera + navegación + título
// + contenido. Si el rol no tiene acceso a la sección, muestra un aviso en
// lugar del contenido (guarda visual; el backend aplica las suyas).
export function AdminScreen({
  active,
  title,
  subtitle,
  children,
}: {
  active: ScreenId
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const session = useAppStore((s) => s.session)
  const allowed = session ? tabsForRole(session.role).some((t) => t.screen === active) : false

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader />
      <AdminNav active={active} />
      <div className="px-4 pb-10 pt-4">
        <h1 className="screen-title">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
        <div className="mt-4">
          {allowed ? (
            children
          ) : (
            <EmptyState
              icon={<Lock className="h-8 w-8" aria-hidden />}
              title="Acceso restringido"
              hint="Tu rol no tiene acceso a esta sección del panel. Si necesitas gestionarla, habla con el propietario."
            />
          )}
        </div>
      </div>
    </div>
  )
}
