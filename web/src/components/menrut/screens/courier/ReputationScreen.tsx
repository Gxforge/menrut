// MENRUT — Mi reputación · Valoraciones y opiniones del mensajero
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Star, ShieldCheck, Flag, EyeOff, MessageSquareQuote, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatDateTime, formatRating, initials, timeAgo } from '@/lib/format'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Rating } from '@/components/menrut/core/Rating'
import { EmptyState, CourierCardSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ReviewDto } from '@/lib/types'

type Filtro = 'todas' | 'verificadas' | 'sin-verificar'

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
        <section aria-label="Puntuación global" className="rounded-2xl border border-line bg-card p-5 text-center">
          <p className="font-display text-[40px] font-bold leading-none">{formatRating(dash.ratingAvg)}</p>
          <div className="mt-2 flex justify-center">
            <Rating value={dash.ratingAvg} showCount={false} />
          </div>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            {dash.ratingCount} {dash.ratingCount === 1 ? 'opinión' : 'opiniones'} · {dash.verifiedDeliveries}{' '}
            {dash.verifiedDeliveries === 1 ? 'entrega verificada' : 'entregas verificadas'}
          </p>

          {/* Distribución 5→1. El backend entrega conteos por estrella;
              aquí se calcula el porcentaje sobre el total de opiniones. */}
          <div className="mt-4 space-y-2" aria-label="Distribución de valoraciones">
            {[5, 4, 3, 2, 1].map((n) => {
              const conteo = distribution[String(n)] ?? 0
              const pct = reviews.length > 0 ? Math.round((conteo / reviews.length) * 100) : 0
              const esMiNivel = n === miNivel && dash.ratingAvg > 0
              return (
                <div key={n} className="flex items-center gap-2.5">
                  <span className="w-8 shrink-0 text-[11.5px] font-semibold text-muted-foreground">
                    {n} <Star className="inline h-3 w-3 fill-orange text-orange" aria-hidden />
                  </span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-label={`${pct}% de las opiniones (${conteo}) tienen ${n} estrellas`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={cn('h-full rounded-full', esMiNivel ? 'bg-blue' : 'bg-blue/40')}
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11.5px] text-muted-foreground">{pct}%</span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            La barra resaltada corresponde a tu promedio actual.
          </p>
        </section>

        {/* Filtros verificadas / sin verificar */}
        <div className="mt-5 flex gap-2" role="group" aria-label="Filtrar opiniones">
          {([
            ['todas', `Todas (${reviews.length})`],
            ['verificadas', `Verificadas (${nVerificadas})`],
            ['sin-verificar', `Sin verificar (${reviews.length - nVerificadas})`],
          ] as [Filtro, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
              aria-pressed={filtro === key}
              className={cn(
                'min-h-[36px] rounded-full border px-3.5 text-[12px] font-semibold transition-all active:scale-95',
                filtro === key
                  ? 'border-blue bg-blue text-white'
                  : 'border-line bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista de opiniones */}
        {reviews.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Star className="h-8 w-8" aria-hidden />}
              title="Todavía no tienes opiniones"
              hint="Se acumularán con tus entregas."
            />
          </div>
        ) : listadoFiltrado.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
            No hay opiniones en este grupo.
          </p>
        ) : (
          <section className="mt-4 space-y-3" aria-label="Opiniones de clientes">
            {listadoFiltrado.map((r) => (
              <article
                key={r.id}
                onClick={() => setAbierta(r)}
                className="cursor-pointer rounded-2xl border border-line bg-card p-4 transition-shadow hover:shadow-[0_10px_30px_rgba(20,67,130,0.08)] active:scale-[0.99]"
              >
                <header className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[12px] font-bold text-blue"
                  >
                    {initials(r.authorName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold leading-tight">{r.authorName}</p>
                    <Rating value={r.rating} showCount={false} size="sm" />
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </header>

                {r.comment && (
                  <p className="mt-2.5 text-[13px] leading-relaxed text-foreground">{r.comment}</p>
                )}

                <footer className="mt-3 flex flex-wrap items-center gap-2">
                  {r.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      Entrega verificada
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Sin verificar
                    </span>
                  )}
                </footer>

                {r.response && (
                  <div className="mt-3 rounded-xl bg-secondary/70 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      <MessageSquareQuote className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      Tu respuesta
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">{r.response}</p>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Las valoraciones no se pueden borrar desde aquí. Si una opinión es abusiva, repórtala y la moderación la revisará.
        </p>
      </div>

      {/* Detalle de la opinión */}
      <Sheet open={!!abierta} onOpenChange={(o) => !o && setAbierta(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-3xl px-5 pb-6">
          <SheetHeader className="px-0 pt-2">
            <SheetTitle>Opinión de {abierta?.authorName}</SheetTitle>
            <SheetDescription>
              {abierta ? formatDateTime(abierta.createdAt) : ''} ·{' '}
              {abierta?.isVerified ? 'Entrega verificada' : 'Sin verificar'}
            </SheetDescription>
          </SheetHeader>

          {abierta && (
            <div className="mt-2 space-y-3">
              <Rating value={abierta.rating} showCount={false} />
              {abierta.comment ? (
                <p className="text-[13.5px] leading-relaxed text-foreground">{abierta.comment}</p>
              ) : (
                <p className="text-[13px] text-muted-foreground">Sin comentario escrito.</p>
              )}

              {abierta.response && (
                <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">Tu respuesta</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed">{abierta.response}</p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full text-destructive hover:text-destructive"
                onClick={() => setReportando(true)}
              >
                <Flag className="h-4 w-4" aria-hidden />
                Reportar abuso
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Tus valoraciones se gestionan con moderación; no se eliminan desde la app.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reportar abuso */}
      <Dialog open={reportando} onOpenChange={(o) => !o && setReportando(false)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reportar esta opinión</DialogTitle>
            <DialogDescription>
              Cuéntanos qué ocurre. La moderación de MENRUT revisará el caso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="razon-reporte">Razón del reporte</Label>
            <Textarea
              id="razon-reporte"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              placeholder="Ej.: lenguaje ofensivo, contenido falso…"
              maxLength={500}
              className="min-h-24 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setReportando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              disabled={razon.trim().length < 5 || reportQ.isPending}
              onClick={() => abierta && reportQ.mutate({ id: abierta.id, razon: razon.trim() })}
            >
              {reportQ.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Enviando…
                </>
              ) : (
                'Enviar reporte'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
