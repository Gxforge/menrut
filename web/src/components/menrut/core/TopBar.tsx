// MENRUT — Barra superior con navegación atrás
'use client'

import { ChevronLeft } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function TopBar({
  title,
  subtitle,
  right,
  onBack,
  className,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  onBack?: () => void
  className?: string
}) {
  const back = useAppStore((s) => s.back)
  const canBack = useAppStore((s) => s.history.length > 0)
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center gap-2 border-b border-line/60 bg-background/85 px-3 py-3 pt-safe backdrop-blur-md',
        className
      )}
    >
      {(canBack || onBack) && (
        <button
          type="button"
          onClick={onBack ?? back}
          aria-label="Volver"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[17px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}
