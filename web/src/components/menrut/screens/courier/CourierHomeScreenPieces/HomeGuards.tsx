// MENRUT — CourierHomeScreen · Estados de carga y error del dashboard.
'use client'

import { EyeOff } from 'lucide-react'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export function HomeLoading() {
  return (
    <div className="px-4 pt-5 pb-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-36 w-full rounded-2xl" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="mt-4"><ListSkeleton count={2} /></div>
    </div>
  )
}

export function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-4 pt-6 pb-8">
      <EmptyState
        icon={<EyeOff className="h-8 w-8" aria-hidden />}
        title="No se pudo cargar tu espacio"
        hint="Revisa tu conexión. El dashboard sigue disponible aunque tu permanencia esté vencida."
        actionLabel="Reintentar"
        onAction={onRetry}
      />
    </div>
  )
}

/** Aviso cuando hay datos guardados en el dispositivo pero el servidor no responde. */
export function StaleNotice() {
  return (
    <div role="status" className="mb-3 rounded-xl border border-line bg-secondary/60 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
      Sin conexión con el servidor. Mostramos los últimos datos guardados en este dispositivo.
    </div>
  )
}
