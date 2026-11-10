// MENRUT — RouteFormScreen · Paso 1: origen y destino.
// El formato depende del scope: provincias (ruta provincial) o selects
// dependientes provincia→municipio (ruta municipal).
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MunicipalityDto, ProvinceDto } from '@/lib/types'
import type { FormState, Scope } from './helpers'

interface TerritoryStepProps {
  scope: Scope
  form: FormState
  patch: (p: Partial<FormState>) => void
  provinces: ProvinceDto[]
  munOrigen: MunicipalityDto[]
  munDestino: MunicipalityDto[]
}

export function TerritoryStep({ scope, form, patch, provinces, munOrigen, munDestino }: TerritoryStepProps) {
  return (
    <section aria-label="Origen y destino" className="space-y-5">
      {scope === 'provincial' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="prov-origen">Provincia de origen</Label>
            <Select value={form.originProvince} onValueChange={(v) => patch({ originProvince: v, originId: null })}>
              <SelectTrigger id="prov-origen" className="h-12 rounded-xl" aria-label="Provincia de origen">
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prov-destino">Provincia de destino</Label>
            <Select value={form.destProvince} onValueChange={(v) => patch({ destProvince: v, destId: null })}>
              <SelectTrigger id="prov-destino" className="h-12 rounded-xl" aria-label="Provincia de destino">
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11.5px] text-muted-foreground">
              Tu ruta se publica como «provincia → provincia» (p. ej. Villa Clara → La Habana).
              Los clientes de cualquier municipio de esas provincias te encontrarán.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="prov-origen">Provincia de origen</Label>
            <Select value={form.originProvince} onValueChange={(v) => patch({ originProvince: v, originId: null })}>
              <SelectTrigger id="prov-origen" className="h-12 rounded-xl" aria-label="Provincia de origen">
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mun-origen">Municipio de origen</Label>
            <Select
              value={form.originId ?? ''}
              onValueChange={(v) => patch({ originId: v })}
              disabled={!form.originProvince}
            >
              <SelectTrigger id="mun-origen" className="h-12 rounded-xl" aria-label="Municipio de origen">
                <SelectValue placeholder={form.originProvince ? 'Selecciona municipio' : 'Elige primero la provincia'} />
              </SelectTrigger>
              <SelectContent>
                {munOrigen.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prov-destino">Provincia de destino</Label>
            <Select value={form.destProvince} onValueChange={(v) => patch({ destProvince: v, destId: null })}>
              <SelectTrigger id="prov-destino" className="h-12 rounded-xl" aria-label="Provincia de destino">
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mun-destino">Municipio de destino</Label>
            <Select
              value={form.destId ?? ''}
              onValueChange={(v) => patch({ destId: v })}
              disabled={!form.destProvince}
            >
              <SelectTrigger id="mun-destino" className="h-12 rounded-xl" aria-label="Municipio de destino">
                <SelectValue placeholder={form.destProvince ? 'Selecciona municipio' : 'Elige primero la provincia'} />
              </SelectTrigger>
              <SelectContent>
                {munDestino.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="paradas">Paradas intermedias (opcional)</Label>
        <Input
          id="paradas"
          value={form.stops}
          onChange={(e) => patch({ stops: e.target.value })}
          placeholder={scope === 'provincial' ? 'Provincias o municipios intermedios, por comas' : 'Municipios intermedios, separados por comas'}
          maxLength={300}
          className="h-12 rounded-xl"
        />
        <p className="text-[11.5px] text-muted-foreground">
          {scope === 'provincial'
            ? 'Ej.: «Matanzas, Cienfuegos». Ayuda a encontrar clientes de trayectos parciales.'
            : 'Ej.: «Colón, Jovellanos». Ayuda a encontrar clientes de trayectos parciales.'}
        </p>
      </div>
    </section>
  )
}
