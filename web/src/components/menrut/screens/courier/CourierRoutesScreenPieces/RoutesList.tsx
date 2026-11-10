// MENRUT — CourierRoutesScreen · Lista de rutas con su menú de acciones
// (editar, pausar/reanudar y eliminar).
'use client'

import {
  MoreVertical, Pencil, PauseCircle, PlayCircle, Trash2,
} from 'lucide-react'
import { RouteCard } from '@/components/menrut/core/RouteCard'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RouteDto } from '@/lib/types'

interface RoutesListProps {
  lista: RouteDto[]
  vacio: string
  onEdit: (r: RouteDto) => void
  onStatus: (p: { id: string; status: 'paused' | 'active' }) => void
  onDelete: (r: RouteDto) => void
}

export function RoutesList({ lista, vacio, onEdit, onStatus, onDelete }: RoutesListProps) {
  if (lista.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
        {vacio}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {lista.map((r) => (
        <div key={r.id} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <RouteCard route={r} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Acciones para la ruta ${r.origin} a ${r.destination}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted-foreground shadow-sm transition-transform active:scale-95 hover:text-foreground"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onEdit(r)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </DropdownMenuItem>
              {r.status !== 'paused' ? (
                <DropdownMenuItem onClick={() => onStatus({ id: r.id, status: 'paused' })}>
                  <PauseCircle className="h-4 w-4" aria-hidden />
                  Pausar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onStatus({ id: r.id, status: 'active' })}>
                  <PlayCircle className="h-4 w-4" aria-hidden />
                  Reanudar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(r)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
