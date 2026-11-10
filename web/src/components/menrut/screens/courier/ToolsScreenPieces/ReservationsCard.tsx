// MENRUT — ToolsScreen · Reservas activas e historial (reserva→confirmación→
// liberación). Confirmar consume el crédito y aplica el efecto; liberar lo
// devuelve; el vencimiento (24 h) libera solo.
'use client'

import { CalendarClock, CircleCheckBig, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ToolReservationDto } from '@/lib/types'

interface ReservationsCardProps {
  reservations: ToolReservationDto[]
  pendingAction: string | null
  onConfirm: (toolId: string, reservationId: string) => void
  onRelease: (toolId: string, reservationId: string) => void
}

const TOOL_LABELS: Record<string, string> = {
  'destacar-perfil': 'Destacar perfil',
  destacado: 'Destacar pasaporte',
  'prioridad-resultados': 'Prioridad en resultados',
  'anuncio-recorrido': 'Anunciar recorrido',
  'estadisticas-avanzadas': 'Estadísticas avanzadas',
  'publicar-rutas': 'Publicar rutas',
}

export function ReservationsCard({ reservations, pendingAction, onConfirm, onRelease }: ReservationsCardProps) {
  const activas = reservations.filter((r) => r.status === 'reserved')
  const historial = reservations.filter((r) => r.status !== 'reserved').slice(0, 5)

  if (reservations.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-card/60 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
        Aún no has reservado herramientas. Reserva una y confírmala al usarla; si no la
        usas en 24 horas, el crédito vuelve solo a tu cartera.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {activas.map((r) => (
        <article
          key={r.id}
          aria-label={`Reserva activa de ${TOOL_LABELS[r.toolCode] ?? r.toolCode}`}
          className="rounded-2xl border border-cyan/30 bg-cyan/5 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-tight">
                {TOOL_LABELS[r.toolCode] ?? r.toolCode}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Reservada · vence {formatDateTime(r.expiresAt)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-cyan/10 px-2.5 py-1 text-[11px] font-bold text-cyan">
              {r.creditCost} {r.creditCost === 1 ? 'crédito' : 'créditos'}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              className="h-10 flex-1 rounded-full text-[13px] font-bold"
              disabled={pendingAction === r.id}
              onClick={() => onConfirm(r.toolId, r.id)}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Confirmar uso
            </Button>
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-full text-[13px] font-semibold"
              disabled={pendingAction === r.id}
              onClick={() => onRelease(r.toolId, r.id)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Liberar y recuperar
            </Button>
          </div>
        </article>
      ))}

      {historial.length > 0 && (
        <section aria-label="Historial de reservas" className="rounded-2xl border border-line bg-card">
          {historial.map((r, i) => (
            <div
              key={r.id}
              className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-line/70')}
            >
              <CircleCheckBig
                className={cn('h-4 w-4 shrink-0', r.status === 'confirmed' ? 'text-success' : 'text-muted-foreground')}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold leading-tight">
                  {TOOL_LABELS[r.toolCode] ?? r.toolCode}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {r.status === 'confirmed'
                    ? `Usada ${r.confirmedAt ? formatDateTime(r.confirmedAt) : ''}`
                    : r.status === 'released'
                      ? `Crédito devuelto ${r.releasedAt ? formatDateTime(r.releasedAt) : ''}`
                      : 'Liberada'}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">-{r.creditCost}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
