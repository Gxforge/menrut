// MENRUT — Pasaporte profesional del mensajero
// Pieza de identidad: cabecera navy, datos verificables vs declarados,
// servicios, cobertura, rutas con próximas salidas y opiniones.
// Las secciones visuales viven en ./PassportScreenPieces/; AppRouter sigue
// importando este archivo.
'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Flag, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopBar } from '@/components/menrut/core/TopBar'
import { api } from '@/lib/api'
import { apiMore } from '@/lib/api-more'
import { useAppStore } from '@/lib/store'
import type { PassportDto } from '@/lib/types'
import { PassportHeader } from './PassportScreenPieces/PassportHeader'
import { DataSection } from './PassportScreenPieces/DataSection'
import { ServicesSection } from './PassportScreenPieces/ServicesSection'
import { CoverageSection } from './PassportScreenPieces/CoverageSection'
import { RoutesSection } from './PassportScreenPieces/RoutesSection'
import { ReviewsSection } from './PassportScreenPieces/ReviewsSection'
import { SaveButton } from './PassportScreenPieces/SaveButton'
import { ReportDialog } from './PassportScreenPieces/ReportDialog'
import { ReviewDialog } from './PassportScreenPieces/ReviewDialog'
import { DeliveryCodeDialog } from './PassportScreenPieces/DeliveryCodeDialog'
import { DeliveryCodeCard } from './PassportScreenPieces/DeliveryCodeCard'
import { PassportSkeleton } from './PassportScreenPieces/PassportSkeleton'
import { NoCourierState, PassportErrorState } from './PassportScreenPieces/EarlyStates'

export default function PassportScreen() {
  const selectedCourierId = useAppStore((s) => s.selectedCourierId)
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const history = useAppStore((s) => s.history)
  const openConversation = useAppStore((s) => s.openConversation)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [deliveryCodeOpen, setDeliveryCodeOpen] = useState(false)
  const [reviewDeliveryId, setReviewDeliveryId] = useState<string | null>(null)

  const passportQuery = useQuery({
    queryKey: ['passport', selectedCourierId],
    queryFn: () => {
      const id = useAppStore.getState().selectedCourierId
      if (!id) throw new Error('No hay mensajero seleccionado')
      return api.passport(id)
    },
    enabled: !!selectedCourierId,
    staleTime: 60_000,
    retry: 1,
  })

  // Semilla del favorito desde la caché de favoritos (si hay sesión)
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.favorites(),
    enabled: !!session,
    staleTime: 60_000,
    retry: 1,
  })

  // Entregas verificadas del cliente con ESTE mensajero: para enlazar la
  // opinión con una entrega verificada por OTP (si existe, se marca).
  const myDeliveriesQuery = useQuery({
    queryKey: ['my-deliveries', selectedCourierId],
    queryFn: () => apiMore.myDeliveries(),
    enabled: !!session && reviewOpen,
    staleTime: 30_000,
    retry: 1,
  })
  const verifiedDeliveryId =
    myDeliveriesQuery.data?.deliveries.find(
      (d) => d.courierId === selectedCourierId && d.status === 'verified',
    )?.id ?? null

  const contactMut = useMutation({
    mutationFn: (courierUserId: string) => api.startConversation(courierUserId),
    onSuccess: (data) => {
      const p = passportQuery.data
      openConversation(data.conversation.id, p?.fullName ?? data.conversation.otherName)
      navigate('chat')
    },
    onError: () => {
      toast.error('No se pudo iniciar la conversación. Inténtalo de nuevo.')
    },
  })

  const reportMut = useMutation({
    mutationFn: (input: { courierId: string; reason: string }) =>
      api.report('profile', input.courierId, input.reason),
    onSuccess: () => {
      toast.success('Reporte enviado. Nuestro equipo lo revisará.')
      setReportOpen(false)
      setReportReason('')
    },
    onError: () => {
      toast.error('No se pudo enviar el reporte. Inténtalo de nuevo.')
    },
  })

  const reviewMut = useMutation({
    mutationFn: (input: { courierId: string; rating: number; comment: string; deliveryId?: string }) =>
      api.submitReview(input.courierId, input.rating, input.comment, input.deliveryId),
    onSuccess: () => {
      toast.success('¡Gracias! Tu opinión se publicó.')
      setReviewOpen(false)
      setReviewRating(0)
      setReviewComment('')
      setReviewDeliveryId(null)
      passportQuery.refetch()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar la opinión.')
    },
  })

  function handleRate() {
    if (!session) {
      toast.info('Crea una cuenta de usuario para opinar y puntuar.')
      navigate('register')
      return
    }
    setReviewRating(0)
    setReviewComment('')
    setReviewOpen(true)
  }

  function handleBack() {
    if (history.length > 0) back()
    else navigate('results')
  }

  function handleContact(p: PassportDto) {
    if (!session) {
      toast.info('Inicia sesión para contactar con el mensajero.')
      navigate('login')
      return
    }
    contactMut.mutate(p.userId)
  }

  // ─── Estados tempranos ─────────────────────────────────────────────────────
  if (!selectedCourierId) {
    return <NoCourierState onBack={handleBack} onGoResults={() => navigate('results')} />
  }

  if (passportQuery.isPending) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Pasaporte profesional" onBack={handleBack} />
        <PassportSkeleton />
      </div>
    )
  }

  if (passportQuery.isError || !passportQuery.data) {
    return <PassportErrorState onBack={handleBack} onRetry={() => passportQuery.refetch()} />
  }

  const p = passportQuery.data
  const initialFavorite =
    favoritesQuery.data?.couriers.some((c) => c.courierId === p.courierId) ?? false
  const visibleReviews = showAllReviews ? p.reviews : p.reviews.slice(0, 3)
  // Zona base del mensajero de zona: su municipio (o su zona habitual).
  const zonaBase =
    p.coverage.length === 1
      ? p.coverage[0]
      : p.coverage.length > 1
        ? 'su zona habitual'
        : 'su municipio base'

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Pasaporte profesional" subtitle={p.fullName} onBack={handleBack} />

      {/* ── Cabecera tipo pasaporte ─────────────────────────────────────────── */}
      <PassportHeader p={p} />

      <main className="flex-1 space-y-6 px-4 pb-6 pt-5">
        {/* ── Grid de datos (verificado vs declarado) ───────────────────────── */}
        <DataSection p={p} />

        {/* ── Sobre mí ──────────────────────────────────────────────────────── */}
        {p.bio && (
          <section aria-labelledby="pp-bio">
            <h2 id="pp-bio" className="section-title mb-2">Sobre mí</h2>
            <p className="rounded-2xl border border-line bg-card p-4 text-[13px] leading-relaxed text-muted-foreground">
              {p.bio}
            </p>
          </section>
        )}

        {/* ── Servicios y cobertura ─────────────────────────────────────────── */}
        {p.services.length > 0 && <ServicesSection services={p.services} />}

        {/* ── Cobertura (según el tipo de mensajero) ─────────────────────── */}
        <CoverageSection coverageType={p.coverageType} coverage={p.coverage} zonaBase={zonaBase} />

        {/* ── Rutas ─────────────────────────────────────────────────────────── */}
        <RoutesSection routes={p.routes} coverageType={p.coverageType} />

        <DeliveryCodeCard
          courierName={p.fullName}
          onOpen={() => setDeliveryCodeOpen(true)}
          visible={!!session && session.id !== p.userId}
        />

        {/* ── Opiniones ─────────────────────────────────────────────────────── */}
        <ReviewsSection
          reviews={visibleReviews}
          totalReviews={p.reviews.length}
          ratingCount={p.ratingCount}
          canRate={session?.id !== p.userId}
          ownerFirstName={p.fullName.split(' ')[0]}
          showAllToggle={p.reviews.length > 3 && !showAllReviews}
          onShowAll={() => setShowAllReviews(true)}
          onRate={handleRate}
        />

        {/* ── Reportar (discreto) ───────────────────────────────────────────── */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-danger active:scale-95"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden />
            Reportar perfil
          </button>
        </div>
      </main>

      {/* ── Acciones fijas ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-line/70 bg-background/95 px-4 py-3 pb-safe backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            className="h-12 flex-1 rounded-full text-[14.5px] font-bold"
            disabled={contactMut.isPending}
            onClick={() => handleContact(p)}
          >
            {contactMut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MessageSquare className="mr-1 h-4 w-4" aria-hidden />
            )}
            {contactMut.isPending ? 'Abriendo conversación…' : 'Contactar'}
          </Button>
          <SaveButton key={`${p.courierId}:${initialFavorite}`} courierId={p.courierId} initial={initialFavorite} />
        </div>
      </div>

      {/* ── Diálogo de reporte ─────────────────────────────────────────────── */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        fullName={p.fullName}
        reason={reportReason}
        onReasonChange={setReportReason}
        pending={reportMut.isPending}
        onSend={() => reportMut.mutate({ courierId: p.courierId, reason: reportReason.trim() })}
      />

      {/* ── Diálogo de valoración ──────────────────────────────────────────── */}
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        firstName={p.fullName.split(' ')[0]}
        rating={reviewRating}
        onRatingChange={setReviewRating}
        comment={reviewComment}
        onCommentChange={setReviewComment}
        canLinkDelivery={!!verifiedDeliveryId}
        linkDelivery={!!verifiedDeliveryId && reviewDeliveryId === verifiedDeliveryId}
        onLinkDeliveryChange={(v) => setReviewDeliveryId(v ? verifiedDeliveryId : null)}
        pending={reviewMut.isPending}
        onSubmit={() =>
          reviewMut.mutate({ courierId: p.courierId, rating: reviewRating, comment: reviewComment.trim(), deliveryId: reviewDeliveryId ?? undefined })
        }
      />

      {/* ── Diálogo de código de entrega (OTP) ── */}
      <DeliveryCodeDialog
        open={deliveryCodeOpen}
        onOpenChange={setDeliveryCodeOpen}
        courierUserId={p.userId}
        courierName={p.fullName}
        onCreate={(cu) => apiMore.createDelivery(cu).then((d) => ({ code: d.code, expiresInSec: d.expiresInSec }))}
      />
    </div>
  )
}
