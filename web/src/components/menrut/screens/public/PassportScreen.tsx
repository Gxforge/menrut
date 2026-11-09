// MENRUT — Pasaporte profesional del mensajero
// Pieza de identidad: cabecera navy, datos verificables vs declarados,
// servicios, cobertura, rutas con próximas salidas y opiniones.
'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Bike, CalendarClock, Flag, Heart, Loader2, MapPin, MessageSquare,
  Package, Route as RouteIcon, ShieldCheck, Star, UserRound, Wrench,
} from 'lucide-react'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Rating } from '@/components/menrut/core/Rating'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { CoverageBadge, VerifiedSeal } from '@/components/menrut/core/StatusBadge'
import { EmptyState, RouteSkeleton } from '@/components/menrut/core/EmptyState'
import { useToggleFavorite } from '@/components/menrut/hooks'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatCup, formatRating, initials, SERVICE_LABELS, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PassportDto } from '@/lib/types'

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
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Pasaporte profesional" onBack={handleBack} />
        <EmptyState
          title="No hay mensajero seleccionado"
          hint="Vuelve a los resultados y elige un mensajero para ver su pasaporte."
          actionLabel="Ir a resultados"
          onAction={() => navigate('results')}
        />
      </div>
    )
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
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Pasaporte profesional" onBack={handleBack} />
        <EmptyState
          icon={<UserRound className="h-8 w-8" aria-hidden />}
          title="No pudimos cargar este pasaporte"
          hint="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={() => passportQuery.refetch()}
          className="flex-1"
        />
      </div>
    )
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
      <header className="relative overflow-hidden bg-gradient-to-b from-navy via-[#0d3375] to-deep px-4 pb-9">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,194,255,0.22)_0%,rgba(11,43,96,0)_55%)]"
        />
        <RouteIcon
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-4 h-44 w-44 rotate-[18deg] text-white/[0.06]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-14 bottom-2 h-40 w-64 rounded-[50%] border-[14px] border-cyan/25 border-r-transparent border-b-transparent rotate-[-16deg]"
        />

        <div className="relative flex flex-col items-center pt-4 text-center">
          <Avatar className="h-24 w-24 border-[5px] border-white/15 shadow-[0_16px_40px_rgba(3,15,40,0.55)]">
            {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt={p.fullName} /> : null}
            <AvatarFallback className="bg-white/10 font-display text-2xl font-bold text-white">
              {initials(p.fullName)}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-3 max-w-[320px] font-display text-[24px] font-extrabold leading-tight text-white">
            {p.fullName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {p.isVerified && <VerifiedSeal className="bg-white/15 text-white" />}
            <CoverageBadge type={p.coverageType} className="bg-white/15 text-white" />
          </div>
          {!p.isVerified && (
            <p className="mt-2 text-[11.5px] text-white/60">Identidad sin verificar por MENRUT</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <Rating value={p.ratingAvg} showCount={false} />
            <span className="text-[13px] font-semibold text-white">{formatRating(p.ratingAvg)}</span>
            <span className="text-[12.5px] text-white/70">· {p.ratingCount} valoraciones</span>
          </div>
          {p.verifiedDeliveries > 0 && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan">
              <Bike className="h-3.5 w-3.5" aria-hidden />
              {p.verifiedDeliveries} entregas verificadas
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-6 pt-5">
        {/* ── Grid de datos (verificado vs declarado) ───────────────────────── */}
        <section aria-label="Datos del mensajero">
          <div className="grid grid-cols-2 gap-3">
            <DataCard
              icon={<Star className="h-4 w-4" aria-hidden />}
              label="Experiencia"
              value={p.yearsExperience > 0 ? `${p.yearsExperience} ${p.yearsExperience === 1 ? 'año' : 'años'}` : '—'}
              note="Declarado por el mensajero"
            />
            <DataCard
              icon={<Wrench className="h-4 w-4" aria-hidden />}
              label="Vehículo"
              value={p.vehicleSummary || '—'}
            />
            <DataCard
              icon={<MapPin className="h-4 w-4" aria-hidden />}
              label="Tarifa orientativa"
              value={p.feeCup !== null && p.feeCup !== undefined ? formatCup(p.feeCup) : 'Por acordar'}
            />
            <DataCard
              icon={<CalendarClock className="h-4 w-4" aria-hidden />}
              label="Disponibilidad"
              value={p.availabilityNote || '—'}
              note="Disponibilidad publicada por el mensajero"
              small
            />
          </div>
        </section>

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
        {p.services.length > 0 && (
          <section aria-labelledby="pp-services">
            <h2 id="pp-services" className="section-title mb-2">Servicios</h2>
            <div className="flex flex-wrap gap-2">
              {p.services.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-semibold text-navy"
                >
                  <Package className="h-3.5 w-3.5 text-blue" aria-hidden />
                  {SERVICE_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Cobertura (según el tipo de mensajero) ─────────────────────── */}
        {p.coverageType === 'zone' ? (
          <section aria-labelledby="pp-zone">
            <h2 id="pp-zone" className="section-title mb-2">Cobertura</h2>
            <div className="rounded-2xl border border-cyan/25 bg-cyan/5 p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-bold leading-snug">
                <MapPin className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
                Trabaja en {zonaBase}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Los clientes de su zona lo encuentran en búsquedas locales. No publica rutas
                interterritoriales: su trabajo se concentra en su municipio.
              </p>
              {p.coverage.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.coverage.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-navy"
                    >
                      <MapPin className="h-3 w-3 text-cyan" aria-hidden />
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : p.coverage.length > 0 ? (
          <section aria-labelledby="pp-coverage">
            <h2 id="pp-coverage" className="section-title mb-2">Cobertura</h2>
            <div className="flex flex-wrap gap-2">
              {p.coverage.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[12.5px] font-medium text-navy"
                >
                  <MapPin className="h-3.5 w-3.5 text-blue" aria-hidden />
                  {c}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Rutas ─────────────────────────────────────────────────────────── */}
        <section aria-labelledby="pp-routes">
          <h2 id="pp-routes" className="section-title mb-2">Rutas que ofrece</h2>
          {p.routes.length > 0 ? (
            <div className="space-y-3">
              {p.routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              {p.coverageType === 'zone'
                ? 'Este mensajero trabaja dentro de su municipio base: no publica rutas interterritoriales. Puedes escribirle para coordinar entregas en su zona.'
                : 'Este mensajero todavía no publica rutas concretas. Puedes escribirle para coordinar.'}
            </p>
          )}
        </section>

        {/* ── Opiniones ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="pp-reviews">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="pp-reviews" className="section-title">Opiniones</h2>
            <span className="text-[12px] text-muted-foreground">{p.ratingCount} en total</span>
          </div>
          {p.reviews.length > 0 ? (
            <div className="space-y-3">
              {visibleReviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold">{review.authorName}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Rating value={review.rating} showCount={false} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                  {review.isVerified && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10.5px] font-semibold text-success">
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      Entrega verificada
                    </span>
                  )}
                  {review.response && (
                    <div className="mt-3 rounded-xl bg-secondary/70 p-3">
                      <p className="text-[11px] font-semibold text-navy">
                        Respuesta de {p.fullName.split(' ')[0]}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                        {review.response}
                      </p>
                    </div>
                  )}
                </article>
              ))}
              {p.reviews.length > 3 && !showAllReviews && (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-full text-[13px] font-semibold"
                  onClick={() => setShowAllReviews(true)}
                >
                  Ver todas las opiniones ({p.reviews.length})
                </Button>
              )}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              Todavía no hay opiniones publicadas para este mensajero.
            </p>
          )}
        </section>

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
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[380px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Reportar perfil</DialogTitle>
            <DialogDescription>
              Cuéntanos qué ocurre con el perfil de {p.fullName}. Solo el equipo de moderación verá tu reporte.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Motivo del reporte (datos falsos, trato inadecuado, estafa…)"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            aria-label="Motivo del reporte"
            className="rounded-xl"
          />
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full font-semibold"
              onClick={() => setReportOpen(false)}
              disabled={reportMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 rounded-full font-bold"
              disabled={reportReason.trim().length < 5 || reportMut.isPending}
              onClick={() => reportMut.mutate({ courierId: p.courierId, reason: reportReason.trim() })}
            >
              {reportMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
              Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function DataCard({
  icon, label, value, note, small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  small?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5 shadow-[0_8px_22px_rgba(20,67,130,0.05)]">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="text-blue">{icon}</span>
        {label}
      </div>
      <p className={cn('mt-1 font-semibold leading-snug', small ? 'text-[12.5px]' : 'text-[14px]')}>
        {value}
      </p>
      {note && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{note}</p>}
    </div>
  )
}

function SaveButton({ courierId, initial }: { courierId: string; initial: boolean }) {
  const { favorite, toggle, isPending } = useToggleFavorite(courierId, initial)
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-pressed={favorite}
      className={cn(
        'flex h-12 w-[76px] shrink-0 items-center justify-center gap-1.5 rounded-full border transition-all active:scale-95',
        favorite
          ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-line bg-card text-muted-foreground hover:border-danger/30 hover:text-danger'
      )}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <>
          <Heart className={cn('h-5 w-5', favorite && 'fill-danger')} aria-hidden />
          <span className="text-[12.5px] font-bold">{favorite ? 'Guardado' : 'Guardar'}</span>
        </>
      )}
    </button>
  )
}

function PassportSkeleton() {
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
