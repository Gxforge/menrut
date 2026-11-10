// MENRUT — RouteFormScreen · Botonera inferior (Atrás / Continuar / Publicar).
'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormActionsProps {
  step: number
  editando: boolean
  saving: boolean
  onPrev: () => void
  onNext: () => void
  onSave: () => void
}

export function FormActions({ step, editando, saving, onPrev, onNext, onSave }: FormActionsProps) {
  return (
    <div className="mt-7 flex gap-3">
      {step > 1 && (
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-full"
          onClick={onPrev}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Atrás
        </Button>
      )}
      {step < 3 ? (
        <Button type="button" className="h-12 flex-1 rounded-full" onClick={onNext}>
          Continuar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <Button
          type="button"
          className="h-12 flex-1 rounded-full"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            <>
              {editando ? 'Guardar cambios' : 'Publicar ruta'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
