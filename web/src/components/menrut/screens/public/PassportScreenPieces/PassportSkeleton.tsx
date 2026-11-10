// MENRUT — PassportScreen · esqueleto de carga del pasaporte.
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { RouteSkeleton } from '@/components/menrut/core/EmptyState'

export function PassportSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pasaporte">
      <div className="flex flex-col items-center bg-gradient-to-b from-navy to-deep px-4 pb-9 pt-6">
        <Skeleton className="h-24 w-24 rounded-full border-[5px] border-white/10" />
        <Skeleton className="mt-4 h-6 w-44" />
        <Skeleton className="mt-3 h-4 w-32" />
      </div>
      <div className="space-y-3 px-4 pb-8 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-card p-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <RouteSkeleton />
        <RouteSkeleton />
      </div>
    </div>
  )
}
