// MENRUT — MapScreen · botón segmentado del toggle de vista.
'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SegmentButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-all active:scale-[0.97]',
        active ? 'bg-card text-blue shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {children}
    </button>
  )
}
