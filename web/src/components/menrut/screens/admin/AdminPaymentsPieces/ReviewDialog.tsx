// MENRUT — Piezas de AdminPaymentsScreen: diálogo de revisión de una
// solicitud de plan (pasos revisar → rechazar / confirmar activación).
'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { formatCup, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmStep, RejectStep } from '@/components/menrut/screens/admin/AdminPaymentsPieces/ReviewSteps'
import type { AdminPaymentDto, PlanDto } from '@/lib/types'

export type ReviewStep = 'review' | 'reject' | 'confirm'

export interface PaymentDecision {
  payment: AdminPaymentDto
  action: 'approve' | 'reject'
  confirmedAmountCup?: number
  reviewNote?: string
}

export function ReviewDialog({
  reviewing,
  step,
  onStep,
  monto,
  onMontoChange,
  motivo,
  onMotivoChange,
  reviewPlan,
  montoNum,
  montoValido,
  deciding,
  onZoom,
  onDecide,
  onClose,
}: {
  reviewing: AdminPaymentDto | null
  step: ReviewStep
  onStep: (s: ReviewStep) => void
  monto: string
  onMontoChange: (v: string) => void
  motivo: string
  onMotivoChange: (v: string) => void
  reviewPlan: PlanDto | null
  montoNum: number
  montoValido: boolean
  deciding: boolean
  onZoom: (p: AdminPaymentDto) => void
  onDecide: (v: PaymentDecision) => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={reviewing !== null}
      onOpenChange={(o) => !o && !deciding && onClose()}
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
                    onClick={() => onZoom(reviewing)}
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
                    onChange={(e) => onMontoChange(e.target.value)}
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
                    disabled={deciding}
                    onClick={() => onStep('reject')}
                  >
                    <XCircle className="h-4 w-4" aria-hidden />
                    Rechazar…
                  </Button>
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-full bg-success font-semibold text-white hover:bg-success/90"
                    disabled={deciding || !montoValido}
                    onClick={() => montoValido && onStep('confirm')}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Aprobar y activar plan
                  </Button>
                </DialogFooter>
              </>
            )}

            {step === 'reject' && (
              <RejectStep
                reviewing={reviewing}
                motivo={motivo}
                onMotivoChange={onMotivoChange}
                deciding={deciding}
                onStep={onStep}
                onDecide={onDecide}
              />
            )}

            {step === 'confirm' && (
              <ConfirmStep
                reviewing={reviewing}
                reviewPlan={reviewPlan}
                montoNum={montoNum}
                montoValido={montoValido}
                deciding={deciding}
                onStep={onStep}
                onDecide={onDecide}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
