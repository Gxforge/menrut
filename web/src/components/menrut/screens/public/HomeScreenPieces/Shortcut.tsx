// MENRUT — HomeScreen · botón de acceso rápido.
'use client'

import type { ReactNode } from 'react'

export function Shortcut({
  icon, label, onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-card px-2 py-3 text-center shadow-[0_8px_22px_rgba(20,67,130,0.05)] transition-all hover:border-blue/40 hover:shadow-[0_12px_30px_rgba(20,67,130,0.10)] active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue">
        {icon}
      </span>
      <span className="text-[11.5px] font-semibold leading-tight">{label}</span>
    </button>
  )
}
