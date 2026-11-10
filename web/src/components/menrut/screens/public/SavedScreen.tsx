// MENRUT — Guardados: rutas guardadas y mensajeros favoritos
// - Rutas: interruptor de alertas («Avisarme de nuevas ofertas»), búsqueda sobre
//   la ruta guardada y eliminación con confirmación.
// - Favoritos: tarjetas de mensajero (CourierCard) hacia el pasaporte.
'use client'

import { useState } from 'react'
import { Heart, MapPin } from 'lucide-react'
import { TabHeader } from '@/components/menrut/screens/public/ClientProfileScreen'
import { FavoritesTab } from '@/components/menrut/screens/public/SavedPieces/FavoritesTab'
import { SavedRoutesTab } from '@/components/menrut/screens/public/SavedPieces/SavedRoutesTab'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function SavedScreen() {
  const session = useAppStore((s) => s.session)
  const [tab, setTab] = useState<'routes' | 'favorites'>('routes')

  return (
    <div className="pb-10">
      <TabHeader title="Guardados" subtitle="Rutas y mensajeros que quieres conservar" />
      <div className="px-4 pt-4">
        {/* Pestañas segmentadas */}
        <div role="tablist" aria-label="Guardados" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'routes'}
            onClick={() => setTab('routes')}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
              tab === 'routes' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Rutas guardadas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
              tab === 'favorites' ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart className="h-4 w-4" aria-hidden />
            Mensajeros favoritos
          </button>
        </div>

        <div className="mt-4">
          {tab === 'routes' ? (
            <SavedRoutesTab userId={session?.id ?? null} />
          ) : (
            <FavoritesTab userId={session?.id ?? null} />
          )}
        </div>
      </div>
    </div>
  )
}
