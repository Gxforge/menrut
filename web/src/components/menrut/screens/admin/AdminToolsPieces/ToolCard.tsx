// MENRUT — Piezas de AdminToolsScreen: tarjeta de herramienta con permisos
// (plan mínimo, membresía) y acceso a la edición.
'use client'

import { ToolTag } from '@/components/menrut/core/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { PlanDto, ToolDto } from '@/lib/types'

const minPlanLabel = (plans: PlanDto[], code: string | null) =>
  code ? (plans.find((p) => p.code === code)?.name ?? code) : 'Ninguno (créditos)'

export function ToolCard({
  tool,
  plans,
  saving,
  onEdit,
  onToggleActive,
}: {
  tool: ToolDto
  plans: PlanDto[]
  saving: boolean
  onEdit: (t: ToolDto) => void
  onToggleActive: (t: ToolDto, v: boolean) => void
}) {
  const t = tool
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-[14.5px] font-bold leading-tight">{t.name}</h3>
            <ToolTag tag={t.tag} />
            {!t.isActive ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Inactiva
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Código {t.code} · {t.creditCost} créditos por uso
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={t.isActive}
            disabled={saving}
            onCheckedChange={(v) => onToggleActive(t, v)}
            aria-label={`Activar o desactivar la herramienta ${t.name}`}
          />
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onEdit(t)}
          >
            Editar
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-navy">
          Plan mínimo: {minPlanLabel(plans, t.minPlanCode)}
        </span>
        {t.requiresActiveMembership ? (
          <span className="inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-[10.5px] font-semibold text-orange">
            Requiere membresía activa
          </span>
        ) : null}
      </div>

      {t.blockedMessage ? (
        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
          Mensaje de bloqueo: «{t.blockedMessage}»
        </p>
      ) : null}
    </article>
  )
}
