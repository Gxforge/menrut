// MENRUT — RouteFormScreen · Stepper 1-2-3 del formulario por pasos.
'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const PASOS = [
  { n: 1, label: 'Trayecto' },
  { n: 2, label: 'Servicio' },
  { n: 3, label: 'Detalles' },
]

export function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-4 flex items-center gap-2" aria-label={`Paso ${step} de 3`}>
      {PASOS.map((p, i) => {
        const done = p.n < step
        const active = p.n === step
        return (
          <li key={p.n} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold',
                active && 'bg-blue text-white',
                done && 'bg-blue/10 text-blue',
                !active && !done && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span>{p.n}</span>}
              {p.label}
            </span>
            {i < PASOS.length - 1 && (
              <span className={cn('h-0.5 flex-1 rounded-full', p.n < step ? 'bg-blue/40' : 'bg-line')} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
