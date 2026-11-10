// MENRUT — CompleteProfileScreen · sección «Verificación de identidad».
'use client'

import type { RefObject } from 'react'
import { CheckCircle2, FileImage, Loader2, Paperclip, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PendingSeal } from '@/components/menrut/core/StatusBadge'
import { toast } from 'sonner'
import { compressImage, fmtFileSize } from '@/lib/image-compress'

export function VerificationSection({
  note,
  onNoteChange,
  file,
  onFileChange,
  sent,
  sending,
  error,
  onSubmit,
  fileInputRef,
}: {
  note: string
  onNoteChange: (v: string) => void
  file: File | null
  onFileChange: (f: File | null) => void
  sent: boolean
  sending: boolean
  error?: string
  onSubmit: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <section aria-labelledby="cp-verify" className="space-y-3">
      <h2 id="cp-verify" className="section-title flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue" aria-hidden />
        Verificación de identidad
      </h2>

      <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
        <div className="flex gap-3 rounded-xl bg-secondary/70 p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            El sello «Identidad verificada» lo revisa y otorga el equipo MENRUT. Tus documentos se
            guardan de forma privada y <strong className="text-foreground">nunca se publican</strong> en
            tu pasaporte.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-success/10 px-4 py-5 text-center" role="status">
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
            <p className="font-display text-[14px] font-semibold">Solicitud enviada</p>
            <PendingSeal />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Te avisaremos por notificación cuando la revisión termine.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="cp-verif-note">Nota para el equipo</Label>
              <Textarea
                id="cp-verif-note"
                rows={3}
                placeholder="Ej.: Mensajero de La Habana, puedo mostrar carné en una videollamada."
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                aria-invalid={!!error}
                className="rounded-xl"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/webp,image/jpeg,.webp,.jpg,.jpeg"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null
                  if (!f) return
                  // Comprime el documento antes de subirlo (ahorro de datos)
                  try {
                    const compressed = await compressImage(f, {
                      maxSide: 1600,
                      targetKb: 220,
                      fileName: 'documento',
                    })
                    onFileChange(compressed)
                    if (compressed.size < f.size) {
                      toast.success(`Documento optimizado: ${fmtFileSize(f.size)} → ${fmtFileSize(compressed.size)}`)
                    }
                  } catch {
                    toast.error('No se pudo procesar la imagen. Prueba con otra.')
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full text-[13px] font-semibold"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-1 h-4 w-4" aria-hidden />
                {file ? 'Cambiar documento' : 'Adjuntar documento (opcional)'}
              </Button>
              {file && (
                <p className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-[12px] text-muted-foreground">
                  <FileImage className="h-4 w-4 shrink-0 text-blue" aria-hidden />
                  <span className="truncate">{file.name} · {fmtFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => onFileChange(null)}
                    className="ml-auto shrink-0 font-semibold text-danger hover:underline"
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={sending}
              onClick={onSubmit}
              className="h-11 w-full rounded-full text-[13.5px] font-bold text-navy"
            >
              {sending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="mr-1 h-4 w-4" aria-hidden />
              )}
              {sending ? 'Enviando solicitud…' : 'Enviar solicitud de verificación'}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
