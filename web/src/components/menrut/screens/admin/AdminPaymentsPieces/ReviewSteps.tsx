// MENRUT — Piezas de AdminPaymentsScreen: pasos «rechazar» y «confirmar
// activación» del diálogo de revisión de pagos.
'use client'

import { CalendarClock, CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { formatCup } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PaymentDecision } from '@/components/menrut/screens/admin/AdminPaymentsPieces/ReviewDialog'
import type { AdminPaymentDto, PlanDto } from '@/lib/types'

export function RejectStep({
  reviewing,
  motivo,
  onMotivoChange,
  deciding,
  onStep,
  onDecide,
}: {
  reviewing: AdminPaymentDto
  motivo: string
  onMotivoChange: (v: string) => void
  deciding: boolean
  onStep: (s: 'review' | 'reject' | 'confirm') => void
  onDecide: (v: PaymentDecision) => void
}) {
  return (
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
          onChange={(e) => onMotivoChange(e.target.value)}
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
          disabled={deciding}
          onClick={() => onStep('review')}
        >
          Volver
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="h-11 flex-1 rounded-full font-semibold"
          disabled={motivo.trim().length < 3 || deciding}
          onClick={() =>
            onDecide({
              payment: reviewing,
              action: 'reject',
              reviewNote: motivo.trim(),
            })
          }
        >
          {deciding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Rechazar solicitud
        </Button>
      </DialogFooter>
    </>
  )
}

export function ConfirmStep({
  reviewing,
  reviewPlan,
  montoNum,
  montoValido,
  deciding,
  onStep,
  onDecide,
}: {
  reviewing: AdminPaymentDto
  reviewPlan: PlanDto | null
  montoNum: number
  montoValido: boolean
  deciding: boolean
  onStep: (s: 'review' | 'reject' | 'confirm') => void
  onDecide: (v: PaymentDecision) => void
}) {
  return (
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
          disabled={deciding}
          onClick={() => onStep('review')}
        >
          Volver
        </Button>
        <Button
          type="button"
          className="h-11 flex-1 rounded-full bg-success font-semibold text-white hover:bg-success/90"
          disabled={!montoValido || deciding}
          onClick={() =>
            montoValido &&
            onDecide({
              payment: reviewing,
              action: 'approve',
              confirmedAmountCup: Math.round(montoNum),
            })
          }
        >
          {deciding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          )}
          Confirmar y activar
        </Button>
      </DialogFooter>
    </>
  )
}
