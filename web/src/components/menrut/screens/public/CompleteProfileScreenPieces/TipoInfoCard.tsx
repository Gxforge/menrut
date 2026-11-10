// MENRUT — CompleteProfileScreen · explicación adaptada al tipo elegido.
'use client'

import { Globe, MapPin, Route as RouteIcon } from 'lucide-react'
import type { CoverageType } from '@/lib/types'

// ─── Explicación adaptada al tipo elegido ───────────────────────────────────

export function TipoInfoCard({
  tipo,
  zonaBase,
  cobertura,
}: {
  tipo: CoverageType
  zonaBase: string | null
  cobertura: string[]
}) {
  if (tipo === 'zone') {
    const multi = cobertura.length > 1
    const titular = multi
      ? 'Trabajas dentro de tu zona'
      : `Trabajas dentro de ${zonaBase ?? 'tu municipio base'}`
    return (
      <div className="space-y-2 rounded-2xl border border-cyan/25 bg-cyan/5 p-4" role="status">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
          {titular}
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Los clientes de tu zona te encontrarán en búsquedas locales. No publicas rutas
          interterritoriales: tu trabajo se concentra en tu municipio.
        </p>
        {cobertura.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {cobertura.map((c) => (
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
    )
  }

  if (tipo === 'municipal') {
    return (
      <div className="space-y-2 rounded-2xl border border-blue/25 bg-blue/5 p-4" role="status">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
          <RouteIcon className="h-4 w-4 shrink-0 text-blue" aria-hidden />
          Publicarás rutas de municipio a municipio
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Cada trayecto se define con origen y destino por municipios (p. ej. Camajuaní → Santa Clara).
          Podrás publicarlos desde «Mis rutas» cuando guardes la ficha.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl border border-orange/25 bg-orange/5 p-4" role="status">
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
        <Globe className="h-4 w-4 shrink-0 text-orange" aria-hidden />
        Publicarás rutas de provincia a provincia
      </p>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Cada trayecto se define con origen y destino por provincias (p. ej. Villa Clara → La Habana).
        Podrás publicarlos desde «Mis rutas» cuando guardes la ficha.
      </p>
    </div>
  )
}
