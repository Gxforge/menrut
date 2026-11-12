// MENRUT — Completar perfil profesional (mensajero)
// Datos profesionales + solicitud de verificación de identidad.
// Solo para sesiones de mensajero; el resto se redirige.
//
// T8-c (tipos de mensajero): la ficha pregunta PRIMERO «¿Cómo trabajas?»
// (en mi zona / entre municipios / entre provincias) y se adapta al tipo.
// Nunca se fuerza provincia→provincia: cada mensajero elige su realidad.
//
// Piezas de esta pantalla en ./CompleteProfileScreenPieces/ (secciones del
// formulario y datos puros); AppRouter sigue importando este archivo.
'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { PassportDto } from '@/lib/types'
import { FichaForm } from './CompleteProfileScreenPieces/FichaForm'
import { BaseMunicipalityCard } from './CompleteProfileScreenPieces/BaseMunicipalityCard'

export default function CompleteProfileScreen() {
  const session = useAppStore((s) => s.session)
  const hydrated = useAppStore((s) => s.hydrated)
  const resetTo = useAppStore((s) => s.resetTo)

  // Guardas: pantalla exclusiva de mensajeros
  useEffect(() => {
    if (!hydrated) return
    if (!session) {
      resetTo('home')
    } else if (session.role === 'client' || session.role === 'business') {
      resetTo('home')
    } else if (session.role === 'admin' || session.role === 'owner' || session.role === 'moderator') {
      resetTo('admin-home')
    }
  }, [hydrated, session, resetTo])

  // Dashboard: tipo actual + courierId (para precargar la propia ficha).
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session && session.role === 'courier',
  })

  // Pasaporte propio: precarga de la ficha (bio, servicios, cobertura…).
  // El dueño siempre puede verlo, aunque su perfil esté oculto.
  const courierId = dashQ.data?.courierId ?? null
  const passportQ = useQuery({
    queryKey: ['passport', courierId],
    queryFn: () => api.passport(courierId ?? ''),
    enabled: !!courierId,
    staleTime: 60_000,
    retry: 1,
  })

  if (!hydrated || !session || session.role !== 'courier') {
    // Guarda actuando: nada que pintar hasta resolver el destino.
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue" aria-label="Cargando" />
      </div>
    )
  }

  // ── Carga ────────────────────────────────────────────────────────────────
  if (dashQ.isPending) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Completar perfil profesional" subtitle="Estos datos se muestran en tu pasaporte" />
        <div className="space-y-4 px-4 pb-10 pt-4" aria-busy="true" aria-label="Cargando ficha">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (dashQ.isError || !dashQ.data) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Completar perfil profesional" subtitle="Estos datos se muestran en tu pasaporte" />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar tu ficha"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void dashQ.refetch()}
          />
        </div>
      </div>
    )
  }

  // La precarga del pasaporte es un detalle: si falla, la ficha arranca vacía.
  const initial: PassportDto | null = passportQ.data ?? null

  return (
    <>
      <BaseMunicipalityCard />
      <FichaForm
        key={courierId ?? 'nueva'}
        courierId={courierId}
        currentType={dashQ.data.coverageType}
        initial={initial}
      />
    </>
  )
}
