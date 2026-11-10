// MENRUT — MembershipScreen · Estados de carga y error de la membresía.
'use client'

import { EyeOff } from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export function MembershipLoading({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <TopBar title="Membresía" subtitle="Tu permanencia y tus créditos" onBack={onBack} />
      <div className="px-4 pt-4 pb-8">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-1 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function MembershipError({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
  return (
    <div>
      <TopBar title="Membresía" subtitle="Tu permanencia y tus créditos" onBack={onBack} />
      <div className="px-4 pt-6 pb-8">
        <EmptyState
          icon={<EyeOff className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar tu membresía"
          hint="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}
