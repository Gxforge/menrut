// MENRUT — Búsqueda avanzada / Filtros
// Todos los controles escriben directamente en el store (search) para que
// Resultados re-consulte con los filtros aplicados.
'use client'

import { BadgeCheck, Bike, Filter, Globe, MapPin, Package, RotateCcw, Route as RouteIcon, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TopBar } from '@/components/menrut/core/TopBar'
import { useAppStore } from '@/lib/store'
import { SERVICE_LABELS, VEHICLE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SearchFilters } from '@/lib/types'

type ServiceKey = SearchFilters['serviceType']
type VehicleKey = SearchFilters['vehicle']
type RouteModeKey = SearchFilters['routeMode']
type CoverageKey = 'any' | 'zone' | 'municipal' | 'provincial'

const SERVICE_OPTIONS: { key: ServiceKey; label: string }[] = [
  { key: 'any', label: 'Cualquiera' },
  { key: 'paquetes', label: SERVICE_LABELS.paquetes },
  { key: 'encargos', label: SERVICE_LABELS.encargos },
  { key: 'entregas_comerciales', label: SERVICE_LABELS.entregas_comerciales },
  { key: 'otros', label: SERVICE_LABELS.otros },
]

const VEHICLE_OPTIONS: { key: VehicleKey; label: string }[] = [
  { key: 'any', label: 'Cualquiera' },
  ...(Object.keys(VEHICLE_LABELS) as VehicleKey[]).map((k) => ({ key: k, label: VEHICLE_LABELS[k] })),
]

// T8-c: tipo de mensajero (corrección del propietario). 'any' = sin filtro.
const COVERAGE_OPTIONS: { key: CoverageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'any', label: 'Cualquiera', icon: null },
  { key: 'zone', label: 'De zona', icon: <MapPin className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'municipal', label: 'Municipal', icon: <RouteIcon className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'provincial', label: 'Provincial', icon: <Globe className="h-3.5 w-3.5" aria-hidden /> },
]

export default function FiltersScreen() {
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const clearSearch = useAppStore((s) => s.clearSearch)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const history = useAppStore((s) => s.history)

  function handleApply() {
    // Vuelve a Resultados; la lista re-consulta con los filtros del store.
    if (history[history.length - 1] === 'results') back()
    else navigate('results')
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Búsqueda avanzada"
        subtitle="Refina la búsqueda de mensajeros"
        onBack={handleApply}
        right={
          <button
            type="button"
            onClick={() => clearSearch()}
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-[12px] font-semibold text-navy transition-all hover:bg-secondary/70 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Limpiar
          </button>
        }
      />

      <div className="flex-1 space-y-5 px-4 pb-8 pt-4">
        {/* Modo de ruta */}
        <FilterBlock icon={<Filter className="h-4 w-4" aria-hidden />} title="Modo de ruta">
          <Segmented<RouteModeKey>
            value={search.routeMode}
            onChange={(v) => setSearch({ routeMode: v })}
            options={[
              { value: 'any', label: 'Cualquiera' },
              { value: 'full', label: 'Ruta completa' },
              { value: 'partial', label: 'Ruta parcial' },
            ]}
          />
        </FilterBlock>

        {/* Tipo de mensajero (zona / municipal / provincial) */}
        <FilterBlock icon={<Users className="h-4 w-4" aria-hidden />} title="Tipo de mensajero">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de mensajero">
            {COVERAGE_OPTIONS.map((opt) => {
              const active = (search.coverageType ?? 'any') === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSearch({ coverageType: opt.key })}
                  className={cn(
                    'inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-semibold transition-all active:scale-95',
                    active
                      ? 'border-blue bg-blue text-white'
                      : 'border-line bg-secondary/60 text-navy hover:border-blue/40'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-muted-foreground">
            De zona trabaja dentro de su municipio · municipal viaja entre municipios · provincial cubre provincia a provincia.
          </p>
        </FilterBlock>

        {/* Tipo de servicio */}
        <FilterBlock icon={<Package className="h-4 w-4" aria-hidden />} title="Tipo de servicio">
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((opt) => {
              const active = search.serviceType === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSearch({ serviceType: opt.key })}
                  className={cn(
                    'min-h-[38px] rounded-full border px-4 text-[12.5px] font-semibold transition-all active:scale-95',
                    active
                      ? 'border-blue bg-blue text-white'
                      : 'border-line bg-secondary/60 text-navy hover:border-blue/40'
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </FilterBlock>

        {/* Vehículo */}
        <FilterBlock icon={<Bike className="h-4 w-4" aria-hidden />} title="Vehículo">
          <Select
            value={search.vehicle}
            onValueChange={(v) => setSearch({ vehicle: v as VehicleKey })}
          >
            <SelectTrigger className="h-12 w-full rounded-xl text-[13.5px]" aria-label="Vehículo">
              <SelectValue placeholder="Cualquiera" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {VEHICLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.key} value={opt.key} className="text-[13px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBlock>

        {/* Valoración mínima */}
        <FilterBlock icon={<Star className="h-4 w-4" aria-hidden />} title="Valoración mínima">
          <Segmented<string>
            value={search.minRating == null ? 'any' : String(search.minRating)}
            onChange={(v) => setSearch({ minRating: v === 'any' ? null : Number(v) })}
            options={[
              { value: 'any', label: 'Cualquiera' },
              { value: '4', label: '4+' },
              { value: '4.5', label: '4.5+' },
            ]}
          />
        </FilterBlock>

        {/* Tarifa máxima */}
        <FilterBlock icon={<Filter className="h-4 w-4" aria-hidden />} title="Tarifa máxima (CUP)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Sin límite"
            value={search.maxFee ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setSearch({ maxFee: v === '' ? null : Math.max(0, Number(v)) })
            }}
            className="h-12 rounded-xl"
            aria-label="Tarifa máxima en CUP"
          />
        </FilterBlock>

        {/* Solo verificados */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
              <BadgeCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <Label htmlFor="filters-verified" className="text-[13.5px] font-semibold">
                Solo verificados
              </Label>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                Mostrar únicamente mensajeros con identidad verificada por MENRUT.
              </p>
            </div>
          </div>
          <Switch
            id="filters-verified"
            checked={search.onlyVerified}
            onCheckedChange={(v) => setSearch({ onlyVerified: v })}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="sticky bottom-0 z-20 border-t border-line/70 bg-background/90 px-4 py-3 pb-safe backdrop-blur-md">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-full text-[14px] font-bold"
            onClick={() => clearSearch()}
          >
            Limpiar
          </Button>
          <Button className="h-12 flex-[2] rounded-full text-[14px] font-bold" onClick={handleApply}>
            Aplicar filtros
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterBlock({
  icon, title, children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold">
        <span className="text-blue">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Opciones"
      className="flex gap-1 rounded-full bg-secondary/70 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-[40px] flex-1 rounded-full px-2 text-[12.5px] font-semibold transition-all active:scale-95',
              active ? 'bg-card text-navy shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
