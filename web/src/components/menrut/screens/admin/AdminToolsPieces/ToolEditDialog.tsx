// MENRUT — Piezas de AdminToolsScreen: diálogo de edición de una herramienta
// (etiqueta, coste en créditos, plan mínimo, bloqueo y visibilidad).
'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ToolFormState } from '@/components/menrut/screens/admin/AdminToolsPieces/formState'
import type { PlanDto, ToolDto } from '@/lib/types'

export function ToolEditDialog({
  toolEditing,
  toolForm,
  plans,
  onToolFormChange,
  valid,
  saving,
  onSubmit,
  onClose,
}: {
  toolEditing: ToolDto | null
  toolForm: ToolFormState | null
  plans: PlanDto[]
  onToolFormChange: (f: ToolFormState) => void
  valid: boolean
  saving: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={toolEditing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="nice-scroll max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar herramienta</DialogTitle>
          <DialogDescription>
            {toolEditing?.name} · código {toolEditing?.code}
          </DialogDescription>
        </DialogHeader>
        {toolForm ? (
          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="tool-name">Nombre</Label>
              <Input
                id="tool-name"
                value={toolForm.name}
                onChange={(e) => onToolFormChange({ ...toolForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tool-tag">Etiqueta</Label>
                <Input
                  id="tool-tag"
                  value={toolForm.tag}
                  onChange={(e) => onToolFormChange({ ...toolForm, tag: e.target.value })}
                  placeholder="BÁSICO, PRO, DESTACADO…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tool-cost">Coste (créditos)</Label>
                <Input
                  id="tool-cost"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={toolForm.creditCost}
                  onChange={(e) => onToolFormChange({ ...toolForm, creditCost: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Plan mínimo</Label>
              <Select
                value={toolForm.minPlanCode ?? 'none'}
                onValueChange={(v) => onToolFormChange({ ...toolForm, minPlanCode: v === 'none' ? null : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (créditos)</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tool-blocked">Mensaje de bloqueo</Label>
              <Textarea
                id="tool-blocked"
                value={toolForm.blockedMessage}
                onChange={(e) => onToolFormChange({ ...toolForm, blockedMessage: e.target.value })}
                rows={2}
                className="resize-none"
                placeholder="Texto que verá el mensajero cuando no pueda usarla."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-secondary/50 px-3.5 py-2.5">
              <Label htmlFor="tool-membership" className="text-[13px]">
                Requiere membresía activa
              </Label>
              <Switch
                id="tool-membership"
                checked={toolForm.requiresActiveMembership}
                onCheckedChange={(v) => onToolFormChange({ ...toolForm, requiresActiveMembership: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-secondary/50 px-3.5 py-2.5">
              <Label htmlFor="tool-active" className="text-[13px]">
                Herramienta activa
              </Label>
              <Switch
                id="tool-active"
                checked={toolForm.isActive}
                onCheckedChange={(v) => onToolFormChange({ ...toolForm, isActive: v })}
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
