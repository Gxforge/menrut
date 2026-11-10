// MENRUT — Piezas de RegisterScreen: selector del tipo de cuenta
// (mensajero, usuario o negocio).
'use client'

import { Check } from 'lucide-react'
import { ROLE_OPTIONS, SignupRole } from '@/components/menrut/screens/public/RegisterPieces/roleOptions'
import { cn } from '@/lib/utils'

export function RolePicker({
  role,
  onRole,
  error,
}: {
  role: SignupRole | null
  onRole: (r: SignupRole) => void
  error?: string
}) {
  return (
    <fieldset className="mt-4" aria-label="Tipo de cuenta">
      <legend className="mb-2 px-1 text-[12.5px] font-semibold text-muted-foreground">
        ¿Qué vas a hacer en MENRUT?
      </legend>
      <div className="grid grid-cols-3 gap-2.5">
        {ROLE_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = role === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRole(opt.value)}
              aria-pressed={active}
              className={cn(
                'relative flex min-h-[118px] flex-col items-center gap-1.5 rounded-2xl border-2 bg-card p-3 text-center transition-all active:scale-95',
                active
                  ? 'border-blue shadow-[0_10px_28px_rgba(20,67,130,0.16)]'
                  : 'border-line hover:border-blue/40',
              )}
            >
              {active && (
                <span
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue text-white"
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  active ? 'bg-blue/15 text-blue' : 'bg-secondary text-muted-foreground',
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[13.5px] font-bold leading-tight">{opt.label}</span>
              <span className="text-[10.5px] leading-tight text-muted-foreground">{opt.tagline}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 px-1 text-xs text-danger">{error}</p>}
    </fieldset>
  )
}
