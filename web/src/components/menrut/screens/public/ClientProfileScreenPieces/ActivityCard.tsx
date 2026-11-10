// MENRUT — ClientProfileScreen · tarjeta Mi actividad: accesos rápidos.
'use client'

import { Bell, ChevronRight, Heart, MessageSquare } from 'lucide-react'
import { useAppStore } from '@/lib/store'

// ─── Tarjeta Mi actividad: accesos rápidos ──────────────────────────────────

const ACTIVITY_LINKS: { screen: 'saved' | 'inbox' | 'notifications'; icon: typeof Heart; label: string; hint: string }[] = [
  { screen: 'saved', icon: Heart, label: 'Guardados', hint: 'Rutas y mensajeros favoritos' },
  { screen: 'inbox', icon: MessageSquare, label: 'Mensajes', hint: 'Tus conversaciones' },
  { screen: 'notifications', icon: Bell, label: 'Notificaciones', hint: 'Novedades y preferencias' },
]

export function ActivityCard() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="px-4 pt-4">
        <h3 className="section-title">Mi actividad</h3>
      </div>
      <ul className="mt-2">
        {ACTIVITY_LINKS.map(({ screen, icon: Icon, label, hint }) => (
          <li key={screen} className="border-t border-line/60 first:border-t-0">
            <button
              type="button"
              onClick={() => navigate(screen)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight">{label}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
