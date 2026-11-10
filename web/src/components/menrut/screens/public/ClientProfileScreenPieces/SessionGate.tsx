// MENRUT — ClientProfileScreen · estado sin sesión (respaldo de las guardas).
'use client'

import { UserRound } from 'lucide-react'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { useAppStore } from '@/lib/store'

// ─── Estado sin sesión (las guardas de AppShell ya redirigen; esto es respaldo) ───

export function SessionGate({ feature }: { feature: string }) {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <div className="px-4 pt-10">
      <EmptyState
        icon={<UserRound className="h-8 w-8" aria-hidden />}
        title="Inicia sesión para continuar"
        hint={`${feature} requiere una cuenta. Entra para gestionar tus datos y tu actividad en MENRUT.`}
        actionLabel="Iniciar sesión"
        onAction={() => navigate('login')}
      />
    </div>
  )
}
