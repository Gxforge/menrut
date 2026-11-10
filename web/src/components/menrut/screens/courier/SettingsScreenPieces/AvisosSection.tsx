// MENRUT — SettingsScreen · Sección «Avisos» (preferencias locales).
'use client'

import { MessageSquare, Route as RouteIcon, Star } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { Avisos } from './helpers'

interface AvisosSectionProps {
  avisos: Avisos | null
  onToggle: (k: keyof Avisos, v: boolean) => void
}

export function AvisosSection({ avisos, onToggle }: AvisosSectionProps) {
  return (
    <section className="mt-5" aria-label="Avisos">
      <h2 className="section-title mb-2.5">Avisos</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {(
          [
            { k: 'mensajes', icon: MessageSquare, label: 'Nuevos mensajes', hint: 'Cuando alguien te escriba' },
            { k: 'rutas', icon: RouteIcon, label: 'Rutas coincidentes', hint: 'Clientes que buscan tu trayecto' },
            { k: 'valoraciones', icon: Star, label: 'Valoraciones', hint: 'Nuevas opiniones de clientes' },
          ] as { k: keyof Avisos; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }[]
        ).map((item) => {
          const Icon = item.icon
          return (
            <div key={item.k} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-tight">{item.label}</p>
                <p className="text-[11.5px] text-muted-foreground">{item.hint}</p>
              </div>
              <Switch
                checked={avisos ? avisos[item.k] : true}
                onCheckedChange={(v) => onToggle(item.k, v)}
                aria-label={item.label}
                disabled={!avisos}
              />
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Preferencias guardadas solo en este dispositivo.
      </p>
    </section>
  )
}
