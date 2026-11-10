// MENRUT — HomeScreen · hero con marca y saludo.
'use client'

import { Bell, Route as RouteIcon } from 'lucide-react'
import { MenrutWordmark } from '@/components/menrut/core/Brand'

export function HomeHero({ onNotifications }: { onNotifications: () => void }) {
  return (
    <header className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-navy via-[#0d3375] to-deep px-4 pb-16 pt-safe">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(0,194,255,0.28)_0%,rgba(11,43,96,0)_60%)]"
      />
      <RouteIcon
        aria-hidden
        className="pointer-events-none absolute -bottom-7 -right-6 h-36 w-36 rotate-[-14deg] text-white/[0.07]"
      />
      <div className="relative flex items-center justify-between pt-4">
        <MenrutWordmark tone="light" className="h-9 w-auto" />
        <button
          type="button"
          onClick={onNotifications}
          aria-label="Notificaciones"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-90"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative mt-7">
        <h1 className="font-display text-[27px] font-extrabold leading-tight tracking-tight text-white">
          ¿A dónde vas?
        </h1>
        <p className="mt-1.5 text-[13.5px] text-white/75">
          Encuentra mensajeros que cubran tu ruta.
        </p>
      </div>
    </header>
  )
}
