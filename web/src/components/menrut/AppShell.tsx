// MENRUT — Shell de la aplicación móvil-first / PWA
// Marco tipo teléfono en escritorio; pantalla completa en móvil.
// main scrollea internamente; la navegación inferior permanece abajo siempre.
'use client'

import { useEffect } from 'react'
import { useAppStore, ADMIN_SCREENS } from '@/lib/store'
import { useSessionBootstrap } from '@/components/menrut/hooks'
import { AppRouter } from './AppRouter'
import { BottomNav } from './core/BottomNav'
import type { Role, ScreenId } from '@/lib/types'

// Pantallas navegables como visitante (funciones públicas)
const PUBLIC_SCREENS: ScreenId[] = [
  'splash', 'welcome', 'login', 'register', 'recovery', 'complete-profile',
  'home', 'filters', 'results', 'passport', 'map',
]

// Roles con acceso al panel de administración (jerarquía del backend:
// propietario > administrador > moderador; este último entra directo a Moderación)
const STAFF_ROLES: Role[] = ['owner', 'admin', 'moderator']

function roleHome(role?: string): ScreenId {
  if (role === 'courier') return 'courier-home'
  if (role === 'owner' || role === 'admin') return 'admin-home'
  if (role === 'moderator') return 'admin-moderation'
  return 'home'
}

export default function AppShell() {
  const { session, ready } = useSessionBootstrap()
  const screen = useAppStore((s) => s.screen)

  // Guardas de navegación según sesión y rol (el backend aplica las suyas)
  useEffect(() => {
    if (!ready) return
    const s = useAppStore.getState()
    const cur = s.screen

    // Con sesión activa, no volver a pantallas de acceso
    if (s.session && ['login', 'register', 'recovery'].includes(cur)) {
      s.resetTo(roleHome(s.session.role))
      return
    }
    // Sin sesión, solo pantallas públicas
    if (!s.session && !PUBLIC_SCREENS.includes(cur)) {
      s.resetTo('welcome')
      return
    }
    // El panel admin es exclusivo del equipo (owner / admin / moderator)
    if (ADMIN_SCREENS.includes(cur) && !(s.session?.role && STAFF_ROLES.includes(s.session.role))) {
      s.resetTo(roleHome(s.session?.role))
    }
  }, [ready, session, screen])

  return (
    <div className="min-h-dvh w-full bg-gradient-to-b from-deep via-navy to-deep sm:flex sm:items-center sm:justify-center sm:p-6">
      {/* Marco tipo app en escritorio */}
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-[0_30px_80px_rgba(3,15,40,0.5)] sm:h-[calc(100dvh-3rem)] sm:rounded-[2.2rem] sm:border sm:border-white/10">
        <main id="contenido" className="nice-scroll flex-1 overflow-y-auto overscroll-contain">
          <AppRouter />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
