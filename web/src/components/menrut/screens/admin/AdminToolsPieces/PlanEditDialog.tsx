// MENRUT — Piezas de AdminToolsScreen: diálogo de edición de un plan de
// membresía (nombre, duración, precio, créditos y visibilidad).
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { PlanFormState } from '@/components/menrut/screens/admin/AdminToolsPieces/formState'
import type { PlanDto } from '@/lib/types'

export function PlanEditDialog({
  planEditing,
  planForm,
  onPlanFormChange,
  valid,
  saving,
  onSubmit,
  onClose,
}: {
  planEditing: PlanDto | null
  planForm: PlanFormState | null
  onPlanFormChange: (f: PlanFormState) => void
  valid: boolean
  saving: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={planEditing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="nice-scroll max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar plan</DialogTitle>
          <DialogDescription>
            {planEditing?.name} · código {planEditing?.code}
          </DialogDescription>
        </DialogHeader>
        {planForm ? (
          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="plan-name">Nombre</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                onChange={(e) => onPlanFormChange({ ...planForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="plan-desc">Descripción</Label>
              <Textarea
                id="plan-desc"
                value={planForm.description}
                onChange={(e) => onPlanFormChange({ ...planForm, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plan-duration">Duración (días)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={planForm.durationDays}
                  onChange={(e) => onPlanFormChange({ ...planForm, durationDays: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-price">Precio (CUP)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={planForm.priceCup}
                  onChange={(e) => onPlanFormChange({ ...planForm, priceCup: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-perm">Créditos permanencia</Label>
                <Input
                  id="plan-perm"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={planForm.permanenceCredits}
                  onChange={(e) => onPlanFormChange({ ...planForm, permanenceCredits: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-tools">Créditos herramientas</Label>
                <Input
                  id="plan-tools"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={planForm.toolCredits}
                  onChange={(e) => onPlanFormChange({ ...planForm, toolCredits: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-secondary/50 px-3.5 py-2.5">
              <Label htmlFor="plan-active" className="text-[13px]">
                Plan activo y visible
              </Label>
              <Switch
                id="plan-active"
                checked={planForm.isActive}
                onCheckedChange={(v) => onPlanFormChange({ ...planForm, isActive: v })}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-full"
            disabled={!valid || saving}
            onClick={onSubmit}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
