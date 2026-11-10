// MENRUT — ClientProfileScreen · encabezado de pestaña (sección raíz de la barra inferior).
'use client'

import type { ReactNode } from 'react'

// ─── Encabezado de pestaña (sin volver: sección raíz de la barra inferior) ───

export function TabHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/85 px-4 py-3.5 pt-safe backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="screen-title truncate">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  )
}
