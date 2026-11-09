// MENRUT — Diálogo de instrucciones de pago (Transfermóvil) · lado mensajero
// Corazón del flujo de compra: resumen del plan, pasos de pago con la tarjeta
// REAL (viene del backend vía api.requestPlan; nunca hardcodeada), copia al
// portapapeles y subida de la captura (api.uploadPaymentProof).
// Compartido por PlanOptionsScreen y MembershipScreen.
//
// Los datos de cobro (método/tarjeta/teléfono/nota) solo los devuelve el
// backend al ABRIR la solicitud; se conservan en localStorage para poder
// recuperar la solicitud pendiente en visitas siguientes (mismo dispositivo).
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2, Clock, Copy, ImageUp, Info, Loader2, Upload, XCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCup } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { PaymentInstructionsDto, PaymentProofDto } from '@/lib/types'

// ── Persistencia local de los datos de cobro (config de plataforma) ─────────

const LS_KEY = 'menrut-payment-instructions'

interface StoredInstructions {
  method: string
  card: string
  phone: string
  note: string
}

export function savePaymentInstructions(i: PaymentInstructionsDto): void {
  try {
    const keep: StoredInstructions = {
      method: i.method, card: i.card, phone: i.phone, note: i.note,
    }
    localStorage.setItem(LS_KEY, JSON.stringify(keep))
  } catch {
    // Sin localStorage la recuperación mostrará solo el resumen de la solicitud.
  }
}

export function loadPaymentInstructions(): StoredInstructions | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredInstructions>
    if (typeof parsed.card !== 'string' || !parsed.card) return null
    return {
      method: typeof parsed.method === 'string' && parsed.method ? parsed.method : '',
      card: parsed.card,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      note: typeof parsed.note === 'string' ? parsed.note : '',
    }
  } catch {
    return null
  }
}

// ── Validación de la captura (imagen jpg/png/webp de hasta 5 MB) ────────────

const MAX_BYTES = 5 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function validateFile(f: File): string | null {
  if (!OK_TYPES.includes(f.type)) return 'La captura debe ser una imagen JPG, PNG o WebP.'
  if (f.size > MAX_BYTES) return 'La imagen supera los 5 MB. Comprime la captura e inténtalo de nuevo.'
  return null
}

// ── Diálogo ──────────────────────────────────────────────────────────────────

export interface PaymentDialogState {
  proof: PaymentProofDto
  instructions: PaymentInstructionsDto | null
  /** Duración del plan en meses (si se conoce), solo informativa. */
  months?: number | null
}

export function PaymentInstructionsDialog({
  open,
  onOpenChange,
  state,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: PaymentDialogState | null
}) {
  const qc = useQueryClient()

  const [uploaded, setUploaded] = useState<PaymentProofDto | null>(null)
  const [changing, setChanging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Reinicio del estado local al cerrar (toda cierre pasa por aquí)
  function resetLocal() {
    setUploaded(null)
    setChanging(false)
    setFile(null)
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
  }

  function handleOpenChange(o: boolean) {
    if (!o) resetLocal()
    if (!uploadQ.isPending) onOpenChange(o)
  }

  // Liberar el object URL al desmontar
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const uploadQ = useMutation({
    mutationFn: async (input: { proofId: string; file: File }) => {
      const err = validateFile(input.file)
      if (err) throw new Error(err)
      return api.uploadPaymentProof(input.proofId, input.file)
    },
    onSuccess: (res) => {
      setUploaded(res.proof)
      setChanging(false)
      setFile(null)
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url)
        return null
      })
      toast.success('Captura enviada')
      void qc.invalidateQueries({ queryKey: ['courier-payments'] })
    },
    onError: (e: Error) =>
      toast.error(e.message || 'No se pudo subir la captura. Inténtalo de nuevo.'),
  })

  if (!state) return null

  const current = uploaded ?? state.proof
  const instructions = state.instructions
  const amount = instructions?.amountCup ?? current.amountCup
  const planName = instructions?.planName ?? current.planName ?? 'tu plan'
  const card = instructions?.card ?? ''
  const method = instructions?.method || (current.method === 'transfermovil' ? 'Transfermóvil' : current.method)
  const months = state.months ?? null

  const enRevision = current.status === 'pending' && current.hasProof && !changing
  const pendienteSinCaptura = current.status === 'pending' && (!current.hasProof || changing)

  async function copyCard() {
    if (!card) return
    try {
      await navigator.clipboard.writeText(card)
      toast.success('Número copiado')
    } catch {
      toast.error('No se pudo copiar. Anota el número a mano.')
    }
  }

  function pickFile(f: File | null) {
    setFile(f)
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return f ? URL.createObjectURL(f) : null
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="nice-scroll max-h-[88dvh] max-w-[400px] overflow-y-auto rounded-2xl p-5">
        {/* ── Solicitud aprobada ── */}
        {current.status === 'approved' && (
          <>
            <DialogHeader>
              <DialogTitle>Pago confirmado</DialogTitle>
              <DialogDescription>
                {planName} · {months ? `${months} ${months === 1 ? 'mes' : 'meses'} · ` : ''}
                {formatCup(current.confirmedAmountCup ?? amount)} confirmados.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-success/10 px-4 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
              <p className="font-display text-[15px] font-bold">Plan activado</p>
              <p className="max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
                El propietario confirmó tu transferencia. Tu membresía y tus créditos ya están acreditados.
              </p>
            </div>
            <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </>
        )}

        {/* ── Solicitud rechazada ── */}
        {current.status === 'rejected' && (
          <>
            <DialogHeader>
              <DialogTitle>Solicitud rechazada</DialogTitle>
              <DialogDescription>{planName} · {formatCup(amount)}.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger/10 px-4 py-8 text-center">
              <XCircle className="h-10 w-10 text-danger" aria-hidden />
              <p className="font-display text-[15px] font-bold">El propietario no pudo confirmar tu pago</p>
              {current.reviewNote ? (
                <p className="max-w-[280px] rounded-xl bg-card px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
                  «{current.reviewNote}»
                </p>
              ) : (
                <p className="max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
                  Revisa el motivo y vuelve a solicitar el plan cuando lo tengas todo listo.
                </p>
              )}
            </div>
            <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </>
        )}

        {/* ── En revisión: captura ya enviada ── */}
        {enRevision && (
          <>
            <DialogHeader>
              <DialogTitle>Solicitud en revisión</DialogTitle>
              <DialogDescription>
                {planName} · {months ? `${months} ${months === 1 ? 'mes' : 'meses'} · ` : ''}
                {formatCup(amount)} por {method}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-orange/10 px-4 py-8 text-center">
              <Clock className="h-10 w-10 text-orange" aria-hidden />
              <p className="font-display text-[15px] font-bold">En revisión</p>
              <p className="max-w-[290px] text-[12.5px] leading-relaxed text-muted-foreground">
                El propietario verificará tu transferencia y activará tu plan.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 w-full rounded-full"
              disabled={uploadQ.isPending}
              onClick={() => setChanging(true)}
            >
              <ImageUp className="h-4 w-4" aria-hidden />
              Cambiar la captura
            </Button>
            <Button className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
              Entendido
            </Button>
          </>
        )}

        {/* ── Flujo activo: instrucciones + subida de captura ── */}
        {pendienteSinCaptura && (
          <>
            <DialogHeader>
              <DialogTitle>Cómo pagar tu plan</DialogTitle>
              <DialogDescription>
                MENRUT no procesa pagos en línea. Transfiere por {method} y sube tu captura:
                el propietario confirmará tu transferencia y activará tu plan.
              </DialogDescription>
            </DialogHeader>

            {/* Resumen */}
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Importe exacto a transferir
              </p>
              <p className="mt-1 font-display text-[26px] font-bold leading-none text-navy">
                {formatCup(amount)}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {planName}
                {months ? ` · ${months} ${months === 1 ? 'mes' : 'meses'}` : ''} · {method}
              </p>
            </div>

            {/* Pasos */}
            <ol className="space-y-2.5 text-[12.5px] leading-relaxed text-foreground/90">
              <li className="flex gap-2.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
                  aria-hidden
                >
                  1
                </span>
                <span>
                  Abre {method} y transfiere exactamente{' '}
                  <strong className="font-semibold">{formatCup(amount)}</strong>
                  {card ? (
                    <> a la tarjeta <strong className="font-semibold">{card}</strong>.</>
                  ) : (
                    <> a la tarjeta de cobro de MENRUT.</>
                  )}
                </span>
              </li>
              <li className="flex gap-2.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
                  aria-hidden
                >
                  2
                </span>
                <span>Guarda la captura de la transferencia.</span>
              </li>
              <li className="flex gap-2.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10.5px] font-bold text-blue"
                  aria-hidden
                >
                  3
                </span>
                <span>Súbela aquí para que el propietario confirme.</span>
              </li>
            </ol>

            {/* Tarjeta (grande, con copiar) — solo si el backend la suministró */}
            {card ? (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tarjeta {method}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="min-w-0 flex-1 font-display text-[19px] font-bold leading-tight tracking-[0.06em] break-all">
                    {card}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 shrink-0 rounded-full px-4"
                    onClick={copyCard}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    Copiar
                  </Button>
                </div>
                {instructions?.phone ? (
                  <p className="mt-2.5 text-[12px] text-muted-foreground">
                    Teléfono: <span className="font-medium text-foreground/80">{instructions.phone}</span>
                  </p>
                ) : null}
                {instructions?.note ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{instructions.note}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-line bg-muted/40 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  Los datos de cobro (tarjeta y teléfono) se muestran al abrir la solicitud. Si no los
                  tienes a mano, escríbenos desde Ayuda y soporte.
                </p>
              </div>
            )}

            {/* Subida de la captura */}
            <div className="space-y-2.5">
              {previewUrl ? (
                <div className="overflow-hidden rounded-xl border border-line bg-muted">
                  <img
                    src={previewUrl}
                    alt="Vista previa de la captura de la transferencia"
                    className="max-h-44 w-full object-cover"
                  />
                </div>
              ) : null}
              <label
                htmlFor="captura-transferencia"
                className={cn(
                  'flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-4 py-3 text-[13px] transition-colors',
                  file
                    ? 'border-success/40 bg-success/5 text-foreground'
                    : 'border-line bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <ImageUp className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {file ? file.name : 'Elegir captura (JPG, PNG o WebP)'}
                </span>
              </label>
              <input
                id="captura-transferencia"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                className="h-12 w-full rounded-full text-[15px] font-bold"
                disabled={!file || uploadQ.isPending}
                onClick={() => file && uploadQ.mutate({ proofId: current.id, file })}
              >
                {uploadQ.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Subiendo…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden />
                    Subir captura
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Imagen JPG, PNG o WebP de hasta 5 MB.
              </p>
            </div>

            <Button
              variant="outline"
              className="h-11 w-full rounded-full"
              disabled={uploadQ.isPending}
              onClick={() => onOpenChange(false)}
            >
              {current.hasProof ? 'Cancelar' : 'Ahora no'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
