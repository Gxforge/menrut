// MENRUT — CourierHomeScreen · Accesos rápidos a las pantallas del mensajero.
'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScreenId } from '@/lib/types'
import type { Acceso } from './helpers'

interface QuickAccessProps {
  accesos: Acceso[]
  onNavigate: (screen: ScreenId) => void
}

export function QuickAccess({ accesos, onNavigate }: QuickAccessProps) {
  return (
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
                onNavigate(a.screen)
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
  )
}
