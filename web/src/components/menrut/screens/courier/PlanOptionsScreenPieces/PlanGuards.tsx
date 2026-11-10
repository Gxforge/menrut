// MENRUT — PlanOptionsScreen · Estados de carga y error del catálogo de planes.
'use client'

import { EyeOff } from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export function PlansLoading({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={onBack} />
      <div className="px-4 pt-4 pb-8">
        <Skeleton className="h-14 rounded-2xl" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="mt-3 h-56 rounded-2xl" />
      </div>
    </div>
  )
}

export function PlansError({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
  return (
    <div>
      <TopBar title="Planes disponibles" subtitle="Compara y elige" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudieron cargar los planes"
          hint="Los planes y precios se administran desde el panel de MENRUT. Inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}
