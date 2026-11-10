// MENRUT — PassportScreen · cobertura según el tipo de mensajero.
'use client'

import { MapPin } from 'lucide-react'
import type { CoverageType, PassportDto } from '@/lib/types'

export function CoverageSection({
  coverageType,
  coverage,
  zonaBase,
}: {
  coverageType: CoverageType
  coverage: PassportDto['coverage']
  zonaBase: string
}) {
  if (coverageType === 'zone') {
    return (
      <section aria-labelledby="pp-zone">
        <h2 id="pp-zone" className="section-title mb-2">Cobertura</h2>
        <div className="rounded-2xl border border-cyan/25 bg-cyan/5 p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-bold leading-snug">
            <MapPin className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
            Trabaja en {zonaBase}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Los clientes de su zona lo encuentran en búsquedas locales. No publica rutas
            interterritoriales: su trabajo se concentra en su municipio.
          </p>
          {coverage.length > 1 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {coverage.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-navy"
                >
                  <MapPin className="h-3 w-3 text-cyan" aria-hidden />
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    )
  }

  if (coverage.length > 0) {
    return (
      <section aria-labelledby="pp-coverage">
        <h2 id="pp-coverage" className="section-title mb-2">Cobertura</h2>
        <div className="flex flex-wrap gap-2">
          {coverage.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[12.5px] font-medium text-navy"
            >
              <MapPin className="h-3.5 w-3.5 text-blue" aria-hidden />
              {c}
            </span>
          ))}
        </div>
      </section>
    )
  }

  return null
}
