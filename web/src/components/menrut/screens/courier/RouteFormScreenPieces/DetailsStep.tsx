// MENRUT — RouteFormScreen · Paso 3: tarifa, salida, notas y vista previa.
'use client'

import { Eye } from 'lucide-react'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { RouteDto } from '@/lib/types'
import type { FormState } from './helpers'

interface DetailsStepProps {
  form: FormState
  patch: (p: Partial<FormState>) => void
  previewRoute: RouteDto | null
}

export function DetailsStep({ form, patch, previewRoute }: DetailsStepProps) {
  return (
    <section aria-label="Tarifa y detalles" className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="tarifa">Tarifa orientativa en CUP (opcional)</Label>
        <Input
          id="tarifa"
          type="number"
          inputMode="numeric"
          min={0}
          value={form.feeCup}
          onChange={(e) => patch({ feeCup: e.target.value })}
          placeholder="Ej. 200"
          className="h-12 rounded-xl"
        />
        <p className="text-[11.5px] text-muted-foreground">
          Si la dejas vacía, los clientes verán «Tarifa por acordar».
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salida">Próxima salida (opcional)</Label>
        <Input
          id="salida"
          type="datetime-local"
          value={form.nextDepartureAt}
          onChange={(e) => patch({ nextDepartureAt: e.target.value })}
          className="h-12 rounded-xl"
        />
        <p className="text-[11.5px] text-muted-foreground">
          La verán los clientes como tu próximo recorrido.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas para los clientes</Label>
        <Textarea
          id="notas"
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Condiciones, punto de recogida, espacio disponible…"
          maxLength={500}
          className="min-h-24 rounded-xl"
        />
      </div>

      {/* Vista previa */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <Eye className="h-4 w-4" aria-hidden />
          Vista previa · Así lo verán los clientes
        </p>
        {previewRoute ? (
          <RouteCard route={previewRoute} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Completa los pasos anteriores para ver la vista previa.
          </p>
        )}
      </div>
    </section>
  )
}
