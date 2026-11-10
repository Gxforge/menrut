// MENRUT — PaymentInstructionsDialog · Subida de la captura de la
// transferencia (con vista previa y compresión previa en el dispositivo).
'use client'

import { ImageUp, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fmtFileSize } from '@/lib/image-compress'

interface ProofUploadProps {
  previewUrl: string | null
  file: File | null
  compressing: boolean
  uploadPending: boolean
  onPick: (f: File | null) => void
  onUpload: () => void
}

export function ProofUpload({
  previewUrl,
  file,
  compressing,
  uploadPending,
  onPick,
  onUpload,
}: ProofUploadProps) {
  return (
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
          {compressing
            ? 'Optimizando captura…'
            : file
              ? `${file.name} · ${fmtFileSize(file.size)}`
              : 'Elegir captura (JPG, PNG o WebP)'}
        </span>
        {compressing && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      </label>
      <input
        id="captura-transferencia"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <Button
        className="h-12 w-full rounded-full text-[15px] font-bold"
        disabled={!file || compressing || uploadPending}
        onClick={onUpload}
      >
        {uploadPending ? (
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
  )
}
