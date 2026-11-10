// MENRUT — RouteFormScreen · Paso 2: frecuencia y servicio.
'use client'

import { FREQ_LABELS, SERVICE_LABELS, VEHICLE_LABELS } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FRECUENCIAS, SERVICIOS, VEHICULOS, type FormState } from './helpers'

interface ServiceStepProps {
  form: FormState
  patch: (p: Partial<FormState>) => void
}

export function ServiceStep({ form, patch }: ServiceStepProps) {
  return (
    <section aria-label="Frecuencia y servicio" className="space-y-5">
      <div className="space-y-2">
        <Label>Frecuencia del recorrido</Label>
        <Select value={form.frequency ?? ''} onValueChange={(v) => patch({ frequency: v })}>
          <SelectTrigger className="h-12 rounded-xl" aria-label="Frecuencia">
            <SelectValue placeholder="Selecciona frecuencia" />
          </SelectTrigger>
          <SelectContent>
            {FRECUENCIAS.map((f) => (
              <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dias">Días o nota de frecuencia</Label>
        <Input
          id="dias"
          value={form.daysNote}
          onChange={(e) => patch({ daysNote: e.target.value })}
          placeholder="Lunes a viernes"
          maxLength={120}
          className="h-12 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de servicio</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de servicio">
          {SERVICIOS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ serviceType: s })}
              aria-pressed={form.serviceType === s}
              className={cn(
                'min-h-[44px] rounded-full border px-4 text-[12.5px] font-semibold transition-all active:scale-95',
                form.serviceType === s
                  ? 'border-blue bg-blue text-white'
                  : 'border-line bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {SERVICE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vehículo</Label>
        <Select value={form.vehicleType ?? ''} onValueChange={(v) => patch({ vehicleType: v })}>
          <SelectTrigger className="h-12 rounded-xl" aria-label="Vehículo">
            <SelectValue placeholder="Selecciona vehículo" />
          </SelectTrigger>
          <SelectContent>
            {VEHICULOS.map((v) => (
              <SelectItem key={v} value={v}>{VEHICLE_LABELS[v]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
