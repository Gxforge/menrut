// MENRUT — Navegación inferior de cinco secciones (rol-aware)
// Estable, con icono + etiqueta, respetando safe areas.
'use client'

import { Home, Map, Heart, MessageSquare, User, Route as RouteIcon, Star, Settings } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useUnreadMessages } from '@/components/menrut/hooks'
import { cn } from '@/lib/utils'
import type { ScreenId } from '@/lib/types'

interface Tab {
  screen: ScreenId
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const CLIENT_TABS: Tab[] = [
  { screen: 'home', icon: Home, label: 'Inicio' },
  { screen: 'map', icon: Map, label: 'Rutas' },
  { screen: 'saved', icon: Heart, label: 'Guardados' },
  { screen: 'inbox', icon: MessageSquare, label: 'Mensajes' },
  { screen: 'client-profile', icon: User, label: 'Perfil' },
]

const COURIER_TABS: Tab[] = [
  { screen: 'courier-home', icon: Home, label: 'Mi espacio' },
  { screen: 'courier-routes', icon: RouteIcon, label: 'Mis rutas' },
  { screen: 'reputation', icon: Star, label: 'Reputación' },
  { screen: 'inbox', icon: MessageSquare, label: 'Mensajes' },
  { screen: 'settings', icon: Settings, label: 'Perfil' },
]

const HIDDEN_ON: ScreenId[] = [
  'splash', 'welcome', 'login', 'register', 'recovery', 'chat',
  'admin-home', 'admin-couriers', 'admin-businesses', 'admin-payments',
  'admin-tools', 'admin-moderation', 'admin-settings', 'admin-system',
]

export function BottomNav() {
  const screen = useAppStore((s) => s.screen)
  const role = useAppStore((s) => s.session?.role)
  const navigate = useAppStore((s) => s.navigate)
  const unread = useUnreadMessages()

  if (HIDDEN_ON.includes(screen)) return null

  const tabs = role === 'courier' ? COURIER_TABS : CLIENT_TABS

  return (
    <nav
      aria-label="Navegación principal"
      className="z-40 border-t border-line/70 bg-card/95 pb-safe backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => {
          const active =
            screen === tab.screen ||
            (tab.screen === 'client-profile' && screen === 'business-profile') ||
            (tab.screen === 'settings' && ['membership', 'plan-options', 'tools', 'route-form'].includes(screen))
          const Icon = tab.icon
          const showBadge = tab.screen === 'inbox' && unread > 0
          return (
            <button
              key={tab.screen}
              type="button"
              onClick={() => navigate(tab.screen)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 pt-2 pb-2 transition-colors',
                active ? 'text-blue' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="relative">
                <Icon className={cn('h-[22px] w-[22px]', active && 'stroke-[2.4]')} aria-hidden />
                {showBadge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className={cn('text-[10.5px] leading-none', active ? 'font-bold' : 'font-medium')}>
                {tab.label}
              </span>
              {active && <span className="absolute top-0 h-[3px] w-8 rounded-full bg-blue" aria-hidden />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
