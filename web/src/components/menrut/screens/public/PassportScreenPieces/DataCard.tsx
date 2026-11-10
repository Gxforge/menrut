// MENRUT — PassportScreen · tarjeta de dato (verificado vs declarado).
'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DataCard({
  icon, label, value, note, small,
}: {
  icon: ReactNode
  label: string
  value: string
  note?: string
  small?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5 shadow-[0_8px_22px_rgba(20,67,130,0.05)]">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="text-blue">{icon}</span>
        {label}
      </div>
      <p className={cn('mt-1 font-semibold leading-snug', small ? 'text-[12.5px]' : 'text-[14px]')}>
        {value}
      </p>
      {note && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{note}</p>}
    </div>
  )
}
