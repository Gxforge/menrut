// MENRUT — Piezas de AdminToolsScreen: tarjeta de plan de membresía con
// interruptor de activación y acceso a la edición.
'use client'

import { formatCup } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { PlanDto } from '@/lib/types'

export function PlanCard({
  plan,
  saving,
  onEdit,
  onToggleActive,
}: {
  plan: PlanDto
  saving: boolean
  onEdit: (p: PlanDto) => void
  onToggleActive: (p: PlanDto, v: boolean) => void
}) {
  const p = plan
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-[14.5px] font-bold leading-tight">{p.name}</h3>
            {p.isProposal ? (
              <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">
                Importe por confirmar
              </span>
            ) : null}
            {p.isTrial ? (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                Prueba
              </span>
            ) : null}
            {!p.isActive ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Inactivo
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">Código {p.code}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={p.isActive}
            disabled={saving}
            onCheckedChange={(v) => onToggleActive(p, v)}
            aria-label={`Activar o desactivar el plan ${p.name}`}
          />
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onEdit(p)}
          >
            Editar
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-2.5 text-[11px]">
        <div>
          <p className="font-display text-[14px] font-bold leading-none">{p.durationDays} días</p>
          <p className="mt-1 leading-tight text-muted-foreground">Duración</p>
        </div>
        <div>
          <p className="font-display text-[14px] font-bold leading-none">{formatCup(p.priceCup)}</p>
          <p className="mt-1 leading-tight text-muted-foreground">Precio</p>
        </div>
        <div>
          <p className="font-display text-[14px] font-bold leading-none">{p.permanenceCredits}</p>
          <p className="mt-1 leading-tight text-muted-foreground">Créditos permanencia</p>
        </div>
        <div>
          <p className="font-display text-[14px] font-bold leading-none">{p.toolCredits}</p>
          <p className="mt-1 leading-tight text-muted-foreground">Créditos herramientas</p>
        </div>
      </div>
    </article>
  )
}
