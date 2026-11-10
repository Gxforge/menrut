// MENRUT — PassportScreen · estados tempranos (sin mensajero / error de carga).
'use client'

import { UserRound } from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'

export function NoCourierState({
  onBack,
  onGoResults,
}: {
  onBack: () => void
  onGoResults: () => void
}) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Pasaporte profesional" onBack={onBack} />
      <EmptyState
        title="No hay mensajero seleccionado"
        hint="Vuelve a los resultados y elige un mensajero para ver su pasaporte."
        actionLabel="Ir a resultados"
        onAction={onGoResults}
      />
    </div>
  )
}

export function PassportErrorState({
  onBack,
  onRetry,
}: {
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Pasaporte profesional" onBack={onBack} />
      <EmptyState
        icon={<UserRound className="h-8 w-8" aria-hidden />}
        title="No pudimos cargar este pasaporte"
        hint="Revisa tu conexión y vuelve a intentarlo."
        actionLabel="Reintentar"
        onAction={onRetry}
        className="flex-1"
      />
    </div>
  )
}
