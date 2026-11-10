// MENRUT — Piezas de SavedScreen: pestaña de mensajeros favoritos.
'use client'

import { useQuery } from '@tanstack/react-query'
import { Heart, RefreshCw } from 'lucide-react'
import { CourierCard } from '@/components/menrut/core/CourierCard'
import { CourierCardSkeleton, EmptyState, SavedEmpty } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export function FavoritesTab({ userId }: { userId: string | null }) {
  const navigate = useAppStore((s) => s.navigate)
  const favorites = useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => api.favorites(),
    enabled: !!userId,
  })

  if (!userId) {
    return (
      <EmptyState
        icon={<Heart className="h-8 w-8" aria-hidden />}
        title="Inicia sesión para guardar favoritos"
        hint="Marca mensajeros como favoritos y encuéntralos aquí al instante. La búsqueda sigue siendo libre, sin cuenta."
        actionLabel="Iniciar sesión"
        onAction={() => navigate('login')}
      />
    )
  }

  if (favorites.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando favoritos">
        <CourierCardSkeleton />
        <CourierCardSkeleton />
      </div>
    )
  }

  if (favorites.isError) {
    return (
      <EmptyState
        icon={<RefreshCw className="h-8 w-8" aria-hidden />}
        title="No pudimos cargar tus favoritos"
        hint="Revisa tu conexión e inténtalo de nuevo."
        actionLabel="Reintentar"
        onAction={() => favorites.refetch()}
      />
    )
  }

  if ((favorites.data?.couriers.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center">
        <SavedEmpty />
        <Button variant="secondary" className="rounded-full px-6" onClick={() => navigate('home')}>
          Explorar mensajeros
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favorites.data?.couriers.map((courier) => (
        <CourierCard key={courier.courierId} courier={courier} />
      ))}
    </div>
  )
}
