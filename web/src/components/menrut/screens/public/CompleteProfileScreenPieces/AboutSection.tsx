// MENRUT — CompleteProfileScreen · sección «Sobre ti» (datos precargados del pasaporte).
'use client'

import { Bike, CalendarClock, Coins, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SERVICE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SERVICE_KEYS, type ServiceKey } from './data'

export function AboutSection({
  bio,
  onBioChange,
  years,
  onYearsChange,
  baseFee,
  onBaseFeeChange,
  vehicle,
  onVehicleChange,
  availability,
  onAvailabilityChange,
  services,
  onToggleService,
  errors,
}: {
  bio: string
  onBioChange: (v: string) => void
  years: string
  onYearsChange: (v: string) => void
  baseFee: string
  onBaseFeeChange: (v: string) => void
  vehicle: string
  onVehicleChange: (v: string) => void
  availability: string
  onAvailabilityChange: (v: string) => void
  services: ServiceKey[]
  onToggleService: (key: ServiceKey) => void
  errors: Record<string, string>
}) {
  return (
    <section aria-labelledby="cp-about" className="space-y-3">
      <h2 id="cp-about" className="section-title flex items-center gap-2">
        <UserRound className="h-4 w-4 text-blue" aria-hidden />
        Sobre ti
      </h2>
      <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="cp-bio">Presentación</Label>
          <Textarea
            id="cp-bio"
            rows={3}
            placeholder="Ej.: Mensajero responsable, especializado en trayectos Habana–Matanzas."
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            aria-invalid={!!errors.bio}
            className="rounded-xl"
          />
          {errors.bio && <p className="text-xs text-danger">{errors.bio}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-years">Años de experiencia</Label>
            <Input
              id="cp-years"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              placeholder="5"
              value={years}
              onChange={(e) => onYearsChange(e.target.value)}
              aria-invalid={!!errors.years}
              className="h-11 rounded-xl"
            />
            {errors.years && <p className="text-xs text-danger">{errors.years}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-fee">Tarifa base (CUP)</Label>
            <div className="relative">
              <Coins
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="cp-fee"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Opcional"
                value={baseFee}
                onChange={(e) => onBaseFeeChange(e.target.value)}
                aria-invalid={!!errors.baseFee}
                className="h-11 rounded-xl pl-10"
              />
            </div>
            {errors.baseFee && <p className="text-xs text-danger">{errors.baseFee}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-vehicle">Vehículo principal</Label>
          <div className="relative">
            <Bike
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="cp-vehicle"
              placeholder="Ej.: Motor Honda"
              value={vehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cp-availability">Disponibilidad declarada</Label>
          <div className="relative">
            <CalendarClock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="cp-availability"
              placeholder="Ej.: Lunes a viernes, mañanas"
              value={availability}
              onChange={(e) => onAvailabilityChange(e.target.value)}
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-semibold">Servicios que ofreces</legend>
          <div className="flex flex-wrap gap-2">
            {SERVICE_KEYS.map((key) => {
              const active = services.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleService(key)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-[36px] rounded-full border px-3.5 text-[12.5px] font-semibold transition-all active:scale-95',
                    active
                      ? 'border-blue bg-blue text-white'
                      : 'border-line bg-secondary/60 text-navy hover:border-blue/40'
                  )}
                >
                  {SERVICE_LABELS[key]}
                </button>
              )
            })}
          </div>
          {errors.services && <p className="text-xs text-danger">{errors.services}</p>}
        </fieldset>
      </div>
    </section>
  )
}
