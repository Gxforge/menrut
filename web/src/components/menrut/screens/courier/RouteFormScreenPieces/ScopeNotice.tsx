// MENRUT — RouteFormScreen · Aviso del formato del trayecto según el tipo
// de mensajero (ruta provincial vs. municipal).
'use client'

import { Globe, Route as RouteIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Scope } from './helpers'

export function ScopeNotice({ scope }: { scope: Scope }) {
  return (
    <p
      className={cn(
        'mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold',
        scope === 'provincial'
          ? 'bg-orange/10 text-orange'
          : 'bg-blue/10 text-blue'
      )}
    >
      {scope === 'provincial' ? (
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <RouteIcon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {scope === 'provincial'
        ? 'Ruta provincial: origen y destino por provincias'
        : 'Ruta municipal: origen y destino por municipios'}
    </p>
  )
}
