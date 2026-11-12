// Municipio base del mensajero (provincia → municipio). Define el cupo gratuito de
// lanzamiento de su municipio. Se guarda aparte de la cobertura.
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { ProvinceDto } from '@/lib/types-shared'

const SELECT =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function BaseMunicipalityCard() {
  const qc = useQueryClient()
  const terrQ = useQuery({ queryKey: ['territories'], queryFn: () => api.territories(), staleTime: 24 * 60 * 60 * 1000 })
  const promoQ = useQuery({ queryKey: ['launch-promo'], queryFn: () => api.launchPromo() })
  const provinces = useMemo<ProvinceDto[]>(() => terrQ.data?.provinces ?? [], [terrQ.data])

  const [provinceId, setProvinceId] = useState('')
  const [municipalityId, setMunicipalityId] = useState('')

  // Precarga desde el estado guardado (buscando la provincia del municipio).
  useEffect(() => {
    const saved = promoQ.data?.municipality?.id
    if (!saved || !provinces.length) return
    const prov = provinces.find((p) => p.municipalities.some((m) => m.id === saved))
    if (prov) {
      setProvinceId(prov.id)
      setMunicipalityId(saved)
    }
  }, [promoQ.data, provinces])

  const municipios = provinces.find((p) => p.id === provinceId)?.municipalities ?? []
  const bloqueado = promoQ.data?.claim !== null && promoQ.data?.claim !== undefined

  const guardar = useMutation({
    mutationFn: () => api.setBaseMunicipality({ provinceId, municipalityId }),
    onSuccess: () => {
      toast.success('Municipio guardado.')
      void qc.invalidateQueries({ queryKey: ['launch-promo'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo guardar el municipio.'),
  })

  return (
    <section aria-label="Municipio base" className="mb-4 rounded-2xl border border-border bg-card p-4">
      <p className="font-display text-sm font-semibold text-foreground">Tu municipio</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        Es el municipio donde vives. Con él se asigna tu cupo gratuito de lanzamiento.
      </p>

      <div className="mt-3 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="base-prov">Provincia</Label>
          <select
            id="base-prov"
            className={SELECT}
            value={provinceId}
            disabled={bloqueado}
            onChange={(e) => {
              setProvinceId(e.target.value)
              setMunicipalityId('')
            }}
          >
            <option value="">Selecciona una provincia</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="base-mun">Municipio</Label>
          <select
            id="base-mun"
            className={SELECT}
            value={municipalityId}
            disabled={!provinceId || bloqueado}
            onChange={(e) => setMunicipalityId(e.target.value)}
          >
            <option value="">Selecciona un municipio</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bloqueado ? (
        <p className="mt-3 text-xs text-muted-foreground">Tu municipio quedó fijado al reclamar el plan de lanzamiento.</p>
      ) : (
        <Button
          className="mt-3 h-11 w-full rounded-xl"
          disabled={!provinceId || !municipalityId || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar municipio'}
        </Button>
      )}
    </section>
  )
}
