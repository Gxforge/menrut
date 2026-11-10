// MENRUT — PassportScreen · sección de servicios ofrecidos.
'use client'

import { Package } from 'lucide-react'
import { SERVICE_LABELS } from '@/lib/format'
import type { PassportDto } from '@/lib/types'

export function ServicesSection({ services }: { services: PassportDto['services'] }) {
  return (
    <section aria-labelledby="pp-services">
      <h2 id="pp-services" className="section-title mb-2">Servicios</h2>
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-navy"
          >
            <Package className="h-3.5 w-3.5 text-blue" aria-hidden />
            {SERVICE_LABELS[s] ?? s}
          </span>
        ))}
      </div>
    </section>
  )
}
