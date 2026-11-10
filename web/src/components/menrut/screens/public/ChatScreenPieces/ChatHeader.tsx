// MENRUT — ChatScreen · barra superior con menú de opciones de la conversación.
'use client'

import { Flag, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TopBar } from '@/components/menrut/core/TopBar'
import { ROLE_LABELS } from './data'
import type { Role } from '@/lib/types'

export function ChatHeader({
  title,
  otherRole,
  onBack,
  onReport,
}: {
  title: string
  otherRole: Role | undefined
  onBack: () => void
  onReport: () => void
}) {
  return (
    <TopBar
      title={title}
      subtitle={otherRole ? ROLE_LABELS[otherRole] : undefined}
      onBack={onBack}
      right={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Opciones de la conversación"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={() => onReport()} className="gap-2 rounded-xl text-danger focus:text-danger">
              <Flag className="h-4 w-4" aria-hidden />
              Reportar conversación
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}
