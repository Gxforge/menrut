// MENRUT — PassportScreen · grid de datos (verificado vs declarado).
'use client'

import { CalendarClock, MapPin, Star, Wrench } from 'lucide-react'
import { formatCup } from '@/lib/format'
import type { PassportDto } from '@/lib/types'
import { DataCard } from './DataCard'

export function DataSection({ p }: { p: PassportDto }) {
  return (
    <section aria-label="Datos del mensajero">
      <div className="grid grid-cols-2 gap-3">
        <DataCard
          icon={<Star className="h-4 w-4" aria-hidden />}
          label="Experiencia"
          value={p.yearsExperience > 0 ? `${p.yearsExperience} ${p.yearsExperience === 1 ? 'año' : 'años'}` : '—'}
          note="Declarado por el mensajero"
        />
        <DataCard
          icon={<Wrench className="h-4 w-4" aria-hidden />}
          label="Vehículo"
          value={p.vehicleSummary || '—'}
        />
        <DataCard
          icon={<MapPin className="h-4 w-4" aria-hidden />}
          label="Tarifa orientativa"
          value={p.feeCup !== null && p.feeCup !== undefined ? formatCup(p.feeCup) : 'Por acordar'}
        />
        <DataCard
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
          label="Disponibilidad"
          value={p.availabilityNote || '—'}
          note="Disponibilidad publicada por el mensajero"
          small
        />
      </div>
    </section>
  )
}
