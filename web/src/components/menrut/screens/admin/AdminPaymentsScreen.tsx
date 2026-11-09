// MENRUT — Administración · Pagos y comprobantes (Transfermóvil)
// Pantalla clave del propietario: revisa la captura del mensajero, pone la
// cantidad que realmente le llegó (cotejando el SMS) y decide. Aprobar activa
// el plan; rechazar exige motivo obligatorio.
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BadgeCheck, CalendarClock, CheckCircle2, FileText, Loader2, Receipt, ShieldCheck, Sparkles, XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatCup, formatDateTime } from '@/lib/format'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AdminPaymentDto, PlanDto } from '@/lib/types'

type PaymentFilter = 'pending' | 'approved' | 'rejected' | 'all'

const FILTERS: { id: PaymentFilter; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
  { id: 'all', label: 'Todas' },
]

function StatusChip({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
        Aprobada
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger">
        Rechazada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
      Pendiente
    </span>
  )
}

// Miniatura del comprobante: botón que amplía en un diálogo; «Sin captura» si
// no existe o si la URL firmada (10 min) caducó o falló.
function ProofThumb({
  payment,
  onOpen,
}: {
  payment: AdminPaymentDto
  onOpen: (p: AdminPaymentDto) => void
}) {
  const [failed, setFailed] = useState(false)
  const url = payment.proofSignedUrl

  if (!payment.hasProof || !url || failed) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-muted/60 px-1 text-center"
        title={payment.hasProof ? 'Comprobante no disponible (refresca la lista)' : 'El mensajero no ha subido captura'}
      >
        <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
        <span className="text-[9px] leading-tight text-muted-foreground">
          {payment.hasProof ? 'No disponible' : 'Sin captura'}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(payment)}
      className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-muted transition-transform active:scale-95"
      aria-label={`Ampliar comprobante de pago de ${payment.courierName}`}
      title="Ampliar comprobante"
    >
      {/* URL firmada externa (bucket privado): img directo, carga diferida */}
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </button>
  )
}

export default function AdminPaymentsScreen() {
  const session = useAppStore((s) => s.session)
  const qc = useQueryClient()

  const [filter, setFilter] = useState<PaymentFilter>('pending')
  const [zoom, setZoom] = useState<AdminPaymentDto | null>(null)
  const [reviewing, setReviewing] = useState<AdminPaymentDto | null>(null)
  const [step, setStep] = useState<'review' | 'reject' | 'confirm'>('review')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')

  // Lista completa (una sola consulta): contadores por estado + filtro en cliente
  const paymentsQ = useQuery({
    queryKey: ['admin-payments', 'all'],
    queryFn: () => api.getAdminPayments('all'),
    enabled: !!session,
  })

  // Catálogo público de planes: días y créditos para el resumen de aprobación
  const plansQ = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() })
  const planByCode = useMemo(() => {
    const map = new Map<string, PlanDto>()
    for (const p of plansQ.data?.plans ?? []) map.set(p.code, p)
    return map
  }, [plansQ.data])

  const payments = paymentsQ.data?.payments ?? []
  const counts = useMemo(() => {
    const c: Record<PaymentFilter, number> = {
      pending: 0, approved: 0, rejected: 0, all: payments.length,
    }
    for (const p of payments) {
      if (p.status === 'pending' || p.status === 'approved' || p.status === 'rejected') {
        c[p.status] += 1
      }
    }
    return c
  }, [payments])

  const visible =
    filter === 'all' ? payments : payments.filter((p) => p.status === filter)

  function openReview(p: AdminPaymentDto) {
    setReviewing(p)
    setStep('review')
    setMonto(String(p.amountCup))
    setMotivo('')
  }

  function closeReview() {
    setReviewing(null)
    setStep('review')
    setMonto('')
    setMotivo('')
  }

  const montoNum = Number(monto)
  const montoValido = monto.trim() !== '' && Number.isFinite(montoNum) && montoNum >= 0

  // Decisión del propietario/administrador (api.decidePayment)
  const decideQ = useMutation({
    mutationFn: (v: {
      payment: AdminPaymentDto
      action: 'approve' | 'reject'
      confirmedAmountCup?: number
      reviewNote?: string
    }) =>
      api.decidePayment(v.payment.id, {
        action: v.action,
        confirmedAmountCup: v.confirmedAmountCup,
        reviewNote: v.reviewNote,
      }),
    onSuccess: (res, v) => {
      if (v.action === 'approve') {
        toast.success(`Plan activado para ${v.payment.courierName}`, {
          description: res.expiresAt
            ? `Membresía activa hasta el ${formatDateTime(res.expiresAt)}.`
            : 'La membresía y los créditos del plan quedaron acreditados.',
        })
      } else {
        toast(`Solicitud de ${v.payment.courierName} rechazada`, {
          description: 'El motivo quedó registrado y el mensajero fue notificado.',
        })
      }
      closeReview()
      void qc.invalidateQueries({ queryKey: ['admin-payments'] })
      void qc.invalidateQueries({ queryKey: ['admin-overview'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'No se pudo guardar la decisión. Inténtalo de nuevo.'),
  })

  const reviewPlan = reviewing ? planByCode.get(reviewing.planCode ?? '') ?? null : null

  return (
    <AdminScreen
      active="admin-payments"
      title="Pagos y comprobantes"
      subtitle="Solicitudes de plan pagadas por Transfermóvil: revisa la captura, confirma la cantidad recibida y activa el plan."
    >
      {/* Nota informativa del flujo de aprobación */}
      <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-line bg-secondary/60 p-3.5">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Al aprobar se acreditan la membresía y los créditos del plan. Coteja la captura con el
          SMS de Transfermóvil y escribe la cantidad que realmente te llegó.
        </p>
      </div>

      {/* Filtros por estado con contadores */}
      <div
        className="nice-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filtrar por estado"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-all active:scale-95',
              filter === f.id
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {paymentsQ.isLoading ? (
          <ListSkeleton count={4} />
        ) : paymentsQ.isError ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8" aria-hidden />}
            title="No se pudieron cargar las solicitudes"
            hint="Comprueba la conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void paymentsQ.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={
              filter === 'pending' ? (
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              ) : (
                <Receipt className="h-8 w-8" aria-hidden />
              )
            }
            title={
              filter === 'pending'
                ? 'No hay solicitudes pendientes'
                : filter === 'approved'
                  ? 'No hay solicitudes aprobadas'
                  : filter === 'rejected'
                    ? 'No hay solicitudes rechazadas'
                    : 'Todavía no hay solicitudes de pago'
            }
            hint="Cuando un mensajero solicite un plan y suba su captura, aparecerá aquí para que lo confirmes."
          />
        ) : (
          visible.map((p) => (
            <article key={p.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <ProofThumb payment={p} onOpen={setZoom} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-[14.5px] font-bold leading-tight">
                        {p.courierName}
                      </h3>
                      <p className="truncate text-[11.5px] text-muted-foreground">{p.courierEmail}</p>
                    </div>
                    <StatusChip status={p.status} />
                  </div>
                  <dl className="mt-1.5 space-y-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium">Plan:</dt>
                      <dd className="truncate font-semibold text-foreground/90">
                        {p.planName ?? 'No especificado'}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium">Solicitado:</dt>
                      <dd className="truncate font-semibold text-foreground/90">
                        {formatCup(p.amountCup)}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium">Fecha:</dt>
                      <dd className="truncate">{formatDateTime(p.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {p.status === 'approved' && p.confirmedAmountCup !== null ? (
                <p className="mt-2.5 rounded-xl bg-success/10 px-3 py-2 text-[11.5px] font-medium text-success">
                  Recibido: {formatCup(p.confirmedAmountCup)}
                  {p.reviewNote ? ` · «${p.reviewNote}»` : ''}
                </p>
              ) : null}
              {p.status === 'rejected' && p.reviewNote ? (
                <p className="mt-2.5 rounded-xl bg-danger/10 px-3 py-2 text-[11.5px] leading-relaxed text-danger">
                  Motivo: {p.reviewNote}
                </p>
              ) : null}

              {p.status === 'pending' ? (
                <Button
                  className="mt-3 h-11 w-full rounded-full font-semibold"
                  disabled={decideQ.isPending}
                  onClick={() => openReview(p)}
                >
                  Revisar
                </Button>
              ) : null}
            </article>
          ))
        )}
      </div>

      {/* Comprobante a tamaño completo */}
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl p-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[14px]">
              Comprobante de {zoom?.courierName}
            </DialogTitle>
            <DialogDescription>
              {zoom?.planName ?? 'Sin plan'} · {zoom ? formatCup(zoom.amountCup) : ''}
            </DialogDescription>
          </DialogHeader>
          {zoom?.proofSignedUrl ? (
            <img
              src={zoom.proofSignedUrl}
              alt={`Comprobante de pago de ${zoom.courierName}`}
              className="max-h-[62dvh] w-full rounded-xl border border-line bg-muted object-contain"
            />
          ) : null}
          <p className="text-center text-[10.5px] text-muted-foreground">
            La imagen caduca a los 10 minutos de cargar la lista; refresca si no se ve.
          </p>
        </DialogContent>
      </Dialog>

      {/* Revisión: captura + cantidad recibida + decisión */}
      <Dialog
        open={reviewing !== null}
        onOpenChange={(o) => !o && !decideQ.isPending && closeReview()}
      >
        <DialogContent className="nice-scroll max-h-[88dvh] max-w-[400px] overflow-y-auto rounded-2xl p-5">
          {reviewing ? (
            <>
              {step === 'review' && (
                <>
                  <DialogHeader>
                    <DialogTitle>Revisar solicitud</DialogTitle>
                    <DialogDescription>
                      {reviewing.courierName} · {reviewing.courierEmail}
                    </DialogDescription>
                  </DialogHeader>

                  {reviewing.hasProof && reviewing.proofSignedUrl ? (
                    <button
                      type="button"
                      onClick={() => setZoom(reviewing)}
                      className="w-full overflow-hidden rounded-xl border border-line bg-muted transition-transform active:scale-[0.98]"
                      aria-label="Ampliar comprobante"
                    >
                      <img
                        src={reviewing.proofSignedUrl}
                        alt={`Comprobante de pago de ${reviewing.courierName}`}
                        className="max-h-56 w-full object-contain"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line bg-muted/50 px-4 py-6 text-center text-[12px] leading-relaxed text-muted-foreground">
                      Sin captura todavía. Puedes esperar a que el mensajero la suba desde su
                      pantalla de Membresía.
                    </div>
                  )}

                  <dl className="space-y-1.5 rounded-xl bg-secondary/60 p-3.5 text-[12px] leading-relaxed">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Plan solicitado</dt>
                      <dd className="text-right font-semibold">{reviewing.planName ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Importe solicitado</dt>
                      <dd className="text-right font-semibold">{formatCup(reviewing.amountCup)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Fecha</dt>
                      <dd className="text-right">{formatDateTime(reviewing.createdAt)}</dd>
                    </div>
                    {reviewPlan ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Se acreditará</dt>
                        <dd className="text-right">
                          {reviewPlan.durationDays} días · {reviewPlan.permanenceCredits} perm. ·{' '}
                          {reviewPlan.toolCredits} herram.
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="space-y-1.5">
                    <Label htmlFor="monto-recibido">Cantidad recibida (CUP)</Label>
                    <Input
                      id="monto-recibido"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Escribe lo que realmente te llegó (coteja el SMS de Transfermóvil). Viene
                      prellenado con el importe del plan.
                    </p>
                  </div>

                  <DialogFooter className="flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full text-danger"
                      disabled={decideQ.isPending}
                      onClick={() => setStep('reject')}
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Rechazar…
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1 rounded-full bg-success font-semibold text-white hover:bg-success/90"
                      disabled={decideQ.isPending || !montoValido}
                      onClick={() => montoValido && setStep('confirm')}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Aprobar y activar plan
                    </Button>
                  </DialogFooter>
                </>
              )}

              {step === 'reject' && (
                <>
                  <DialogHeader>
                    <DialogTitle>Rechazar solicitud</DialogTitle>
                    <DialogDescription>
                      {reviewing.courierName} · {reviewing.planName ?? 'Sin plan'} ·{' '}
                      {formatCup(reviewing.amountCup)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label htmlFor="motivo-rechazo">Motivo del rechazo</Label>
                    <Textarea
                      id="motivo-rechazo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej.: la captura no corresponde al importe del plan."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                      El motivo es obligatorio (mínimo 3 caracteres). El mensajero lo verá en su
                      historial de solicitudes.
                    </p>
                  </div>
                  <DialogFooter className="flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      disabled={decideQ.isPending}
                      onClick={() => setStep('review')}
                    >
                      Volver
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 flex-1 rounded-full font-semibold"
                      disabled={motivo.trim().length < 3 || decideQ.isPending}
                      onClick={() =>
                        decideQ.mutate({
                          payment: reviewing,
                          action: 'reject',
                          reviewNote: motivo.trim(),
                        })
                      }
                    >
                      {decideQ.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      Rechazar solicitud
                    </Button>
                  </DialogFooter>
                </>
              )}

              {step === 'confirm' && (
                <>
                  <DialogHeader>
                    <DialogTitle>Confirmar activación</DialogTitle>
                    <DialogDescription>
                      Se acreditará el plan a {reviewing.courierName}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2.5 rounded-2xl border border-line bg-card p-4 text-[12.5px] leading-relaxed">
                    <p className="flex items-center gap-2 font-display text-[14px] font-bold">
                      <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                      {reviewing.planName ?? 'Plan'}
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Cantidad recibida</span>
                      <span className="font-semibold">{montoValido ? formatCup(montoNum) : '—'}</span>
                    </p>
                    {reviewPlan ? (
                      <>
                        <p className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Duración</span>
                          <span className="font-semibold">{reviewPlan.durationDays} días</span>
                        </p>
                        <p className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Permanencia</span>
                          <span className="font-semibold">
                            +{reviewPlan.permanenceCredits} créditos (≈{' '}
                            {Math.round(reviewPlan.permanenceCredits / 10)} días)
                          </span>
                        </p>
                        <p className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Herramientas</span>
                          <span className="flex items-center gap-1 font-semibold">
                            <Sparkles className="h-3.5 w-3.5 text-cyan" aria-hidden />
                            +{reviewPlan.toolCredits} créditos
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        La duración y los créditos del plan no están disponibles (plan retirado del
                        catálogo); la activación usará los datos registrados en la solicitud.
                      </p>
                    )}
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    Si la cantidad recibida difiere del importe del plan, revísalo antes de
                    confirmar: el mensajero verá la cantidad confirmada en su historial.
                  </p>
                  <DialogFooter className="flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      disabled={decideQ.isPending}
                      onClick={() => setStep('review')}
                    >
                      Volver
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1 rounded-full bg-success font-semibold text-white hover:bg-success/90"
                      disabled={!montoValido || decideQ.isPending}
                      onClick={() =>
                        montoValido &&
                        decideQ.mutate({
                          payment: reviewing,
                          action: 'approve',
                          confirmedAmountCup: Math.round(montoNum),
                        })
                      }
                    >
                      {decideQ.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      )}
                      Confirmar y activar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminScreen>
  )
}
