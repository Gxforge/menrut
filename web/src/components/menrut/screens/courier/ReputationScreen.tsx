// MENRUT — Mi reputación · Valoraciones y opiniones del mensajero
// (Las secciones viven en ReputationScreenPieces/.)
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { EmptyState, CourierCardSkeleton } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingSummary } from './ReputationScreenPieces/RatingSummary'
import { ReviewFilters, type Filtro } from './ReputationScreenPieces/ReviewFilters'
import { ReviewList } from './ReputationScreenPieces/ReviewList'
import { ReviewDetailSheet } from './ReputationScreenPieces/ReviewDetailSheet'
import { ReportDialog } from './ReputationScreenPieces/ReportDialog'
import type { ReviewDto } from '@/lib/types'

export default function ReputationScreen() {
  const session = useAppStore((s) => s.session)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [abierta, setAbierta] = useState<ReviewDto | null>(null)
  const [reportando, setReportando] = useState(false)
  const [razon, setRazon] = useState('')

  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })
  const revQ = useQuery({
    queryKey: ['courier-reviews'],
    queryFn: () => api.courierReviews(),
    enabled: !!session,
  })

  // Reportar abuso de una opinión (la moderación la revisa)
  const reportQ = useMutation({
    mutationFn: (p: { id: string; razon: string }) => api.report('review', p.id, p.razon),
    onSuccess: () => {
      toast.success('Reporte enviado. La moderación lo revisará.')
      setReportando(false)
      setAbierta(null)
      setRazon('')
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo enviar el reporte.'),
  })

  const dash = dashQ.data
  const reviews = revQ.data?.reviews ?? []
  const distribution = revQ.data?.distribution ?? {}

  const miNivel = dash ? Math.min(5, Math.max(1, Math.round(dash.ratingAvg))) : 0

  const listadoFiltrado = useMemo(() => {
    if (filtro === 'verificadas') return reviews.filter((r) => r.isVerified)
    if (filtro === 'sin-verificar') return reviews.filter((r) => !r.isVerified)
    return reviews
  }, [reviews, filtro])

  const nVerificadas = reviews.filter((r) => r.isVerified).length

  // ── Carga ─────────────────────────────────────────────────────────────
  if (revQ.isLoading || dashQ.isLoading) {
    return (
      <div>
        <TopBar title="Mi reputación" subtitle="La confianza se construye con experiencias" />
        <div className="px-4 pt-4 pb-8">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="mt-4 space-y-3">
            <CourierCardSkeleton />
            <CourierCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (revQ.isError || dashQ.isError || !dash) {
    return (
      <div>
        <TopBar title="Mi reputación" subtitle="La confianza se construye con experiencias" />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<EyeOff className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar tu reputación"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => {
              void revQ.refetch()
              void dashQ.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Mi reputación" subtitle="La confianza se construye con experiencias" />

      <div className="px-4 pt-4 pb-8">
        {/* Puntuación global */}
        <RatingSummary
          ratingAvg={dash.ratingAvg}
          ratingCount={dash.ratingCount}
          verifiedDeliveries={dash.verifiedDeliveries}
          distribution={distribution}
          totalReviews={reviews.length}
          miNivel={miNivel}
        />

        {/* Filtros verificadas / sin verificar */}
        <ReviewFilters
          filtro={filtro}
          total={reviews.length}
          nVerificadas={nVerificadas}
          onChange={setFiltro}
        />

        {/* Lista de opiniones */}
        <ReviewList reviews={reviews} listadoFiltrado={listadoFiltrado} onOpen={setAbierta} />

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Las valoraciones no se pueden borrar desde aquí. Si una opinión es abusiva, repórtala y la moderación la revisará.
        </p>
      </div>

      {/* Detalle de la opinión */}
      <ReviewDetailSheet
        abierta={abierta}
        onClose={() => setAbierta(null)}
        onReport={() => setReportando(true)}
      />

      {/* Reportar abuso */}
      <ReportDialog
        open={reportando}
        onClose={() => setReportando(false)}
        razon={razon}
        onRazonChange={setRazon}
        isPending={reportQ.isPending}
        onSend={() => abierta && reportQ.mutate({ id: abierta.id, razon: razon.trim() })}
      />
    </div>
  )
}
