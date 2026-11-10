// MENRUT — Diálogo de instrucciones de pago (Transfermóvil) · lado mensajero
// Corazón del flujo de compra: resumen del plan, pasos de pago con la tarjeta
// REAL (viene del backend vía api.requestPlan; nunca hardcodeada), copia al
// portapapeles y subida de la captura (api.uploadPaymentProof).
// Compartido por PlanOptionsScreen y MembershipScreen.
//
// Los datos de cobro (método/tarjeta/teléfono/nota) solo los devuelve el
// backend al ABRIR la solicitud; se conservan en localStorage para poder
// recuperar la solicitud pendiente en visitas siguientes (mismo dispositivo).
// (Persistencia en PaymentInstructionsDialogPieces/storage y paneles de
// contenido en el resto de piezas de la misma carpeta.)
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { compressImage, fmtFileSize } from '@/lib/image-compress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { validateFile } from './PaymentInstructionsDialogPieces/storage'
import { ApprovedPanel, RejectedPanel, ReviewPanel } from './PaymentInstructionsDialogPieces/DialogStates'
import { PaymentSteps } from './PaymentInstructionsDialogPieces/PaymentSteps'
import { ProofUpload } from './PaymentInstructionsDialogPieces/ProofUpload'
import type { PaymentInstructionsDto, PaymentProofDto } from '@/lib/types'

// Persistencia local de los datos de cobro (re-exportada para las pantallas).
export { loadPaymentInstructions, savePaymentInstructions } from './PaymentInstructionsDialogPieces/storage'

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
  const [compressing, setCompressing] = useState(false)

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

  // Al elegir la captura se comprime en el teléfono ANTES de subir: se
  // redimensiona a ≤1600 px y se convierte a WebP ligero (≈200 KB) para
  // gastar menos datos móviles y menos almacenamiento.
  async function pickFile(f: File | null) {
    if (!f) {
      setFile(null)
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url)
        return null
      })
      return
    }
    const err = validateFile(f)
    if (err) {
      toast.error(err)
      return
    }
    setCompressing(true)
    try {
      const compressed = await compressImage(f, { maxSide: 1600, targetKb: 220, fileName: 'captura' })
      setFile(compressed)
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url)
        return URL.createObjectURL(compressed)
      })
      if (compressed.size < f.size) {
        toast.success(`Captura optimizada: ${fmtFileSize(f.size)} → ${fmtFileSize(compressed.size)}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo procesar la imagen. Prueba con otra.')
    } finally {
      setCompressing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="nice-scroll max-h-[88dvh] max-w-[400px] overflow-y-auto rounded-2xl p-5">
        {/* ── Solicitud aprobada ── */}
        {current.status === 'approved' && (
          <ApprovedPanel
            current={current}
            amount={amount}
            planName={planName}
            months={months}
            onClose={() => onOpenChange(false)}
          />
        )}

        {/* ── Solicitud rechazada ── */}
        {current.status === 'rejected' && (
          <RejectedPanel
            current={current}
            amount={amount}
            planName={planName}
            onClose={() => onOpenChange(false)}
          />
        )}

        {/* ── En revisión: captura ya enviada ── */}
        {enRevision && (
          <ReviewPanel
            planName={planName}
            months={months}
            amount={amount}
            method={method}
            uploadPending={uploadQ.isPending}
            onChangeCapture={() => setChanging(true)}
            onClose={() => onOpenChange(false)}
          />
        )}

        {/* ── Flujo activo: instrucciones + subida de captura ── */}
        {pendienteSinCaptura && (
          <>
            <PaymentSteps
              amount={amount}
              planName={planName}
              months={months}
              method={method}
              card={card}
              instructions={instructions}
              onCopyCard={() => void copyCard()}
            />

            {/* Subida de la captura */}
            <ProofUpload
              previewUrl={previewUrl}
              file={file}
              compressing={compressing}
              uploadPending={uploadQ.isPending}
              onPick={(f) => void pickFile(f)}
              onUpload={() => file && uploadQ.mutate({ proofId: current.id, file })}
            />

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
