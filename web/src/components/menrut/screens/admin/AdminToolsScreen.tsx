// MENRUT — Administración · Planes y herramientas
'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Wrench, Ticket, Loader2, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCup } from '@/lib/format'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { ToolTag } from '@/components/menrut/core/StatusBadge'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { PlanDto, ToolDto } from '@/lib/types'

// ─── Formularios ─────────────────────────────────────────────────────────────

interface PlanFormState {
  name: string
  description: string
  durationDays: string
  priceCup: string
  permanenceCredits: string
  toolCredits: string
  isActive: boolean
}

interface ToolFormState {
  name: string
  description: string
  tag: string
  minPlanCode: string | null
  creditCost: string
  requiresActiveMembership: boolean
  isActive: boolean
  blockedMessage: string
}

const isNonNegative = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n >= 0
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function AdminToolsScreen() {
  const qc = useQueryClient()

  // Catálogos reales (endpoints públicos de planes y herramientas)
  const plansQ = useQuery({ queryKey: ['plans'], queryFn: () => api.plans() })
  const toolsQ = useQuery({ queryKey: ['tools'], queryFn: () => api.tools() })

  const plans = plansQ.data?.plans ?? []
  const tools = toolsQ.data?.tools ?? []

  // Edición de planes
  const [planEditing, setPlanEditing] = useState<PlanDto | null>(null)
  const [planForm, setPlanForm] = useState<PlanFormState | null>(null)

  // Edición de herramientas
  const [toolEditing, setToolEditing] = useState<ToolDto | null>(null)
  const [toolForm, setToolForm] = useState<ToolFormState | null>(null)

  const savePlan = useMutation({
    mutationFn: (plan: Partial<PlanDto> & { code: string }) => api.adminSavePlan(plan),
    onSuccess: (res) => {
      toast.success(`Plan «${res.plan.name}» guardado`)
      setPlanEditing(null)
      setPlanForm(null)
      qc.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (err: Error) => toast.error(err.message || 'No se pudo guardar el plan.'),
  })

  const saveTool = useMutation({
    mutationFn: (tool: Partial<ToolDto> & { code: string }) => api.adminSaveTool(tool),
    onSuccess: (res) => {
      toast.success(`Herramienta «${res.tool.name}» guardada`)
      setToolEditing(null)
      setToolForm(null)
      qc.invalidateQueries({ queryKey: ['tools'] })
    },
    onError: (err: Error) => toast.error(err.message || 'No se pudo guardar la herramienta.'),
  })

  const openPlanEdit = (p: PlanDto) => {
    setPlanEditing(p)
    setPlanForm({
      name: p.name,
      description: p.description,
      durationDays: String(p.durationDays),
      priceCup: String(p.priceCup),
      permanenceCredits: String(p.permanenceCredits),
      toolCredits: String(p.toolCredits),
      isActive: p.isActive,
    })
  }

  const openToolEdit = (t: ToolDto) => {
    setToolEditing(t)
    setToolForm({
      name: t.name,
      description: t.description,
      tag: t.tag,
      minPlanCode: t.minPlanCode,
      creditCost: String(t.creditCost),
      requiresActiveMembership: t.requiresActiveMembership,
      isActive: t.isActive,
      blockedMessage: t.blockedMessage,
    })
  }

  const planValid =
    !!planForm &&
    planForm.name.trim().length > 0 &&
    isNonNegative(planForm.durationDays) &&
    isNonNegative(planForm.priceCup) &&
    isNonNegative(planForm.permanenceCredits) &&
    isNonNegative(planForm.toolCredits)

  const toolValid = !!toolForm && toolForm.name.trim().length > 0 && isNonNegative(toolForm.creditCost)

  const submitPlan = () => {
    if (!planEditing || !planForm) return
    savePlan.mutate({
      ...planEditing,
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      durationDays: Math.round(Number(planForm.durationDays)),
      priceCup: Number(planForm.priceCup),
      permanenceCredits: Math.round(Number(planForm.permanenceCredits)),
      toolCredits: Math.round(Number(planForm.toolCredits)),
      isActive: planForm.isActive,
    })
  }

  const submitTool = () => {
    if (!toolEditing || !toolForm) return
    saveTool.mutate({
      ...toolEditing,
      name: toolForm.name.trim(),
      description: toolForm.description.trim(),
      tag: toolForm.tag.trim() || toolEditing.tag,
      minPlanCode: toolForm.minPlanCode,
      creditCost: Math.round(Number(toolForm.creditCost)),
      requiresActiveMembership: toolForm.requiresActiveMembership,
      isActive: toolForm.isActive,
      blockedMessage: toolForm.blockedMessage.trim(),
    })
  }

  const minPlanLabel = (code: string | null) =>
    code ? (plans.find((p) => p.code === code)?.name ?? code) : 'Ninguno (créditos)'

  return (
    <AdminScreen
      active="admin-tools"
      title="Planes y herramientas"
      subtitle="Fuente de verdad de importes, créditos y permisos. Los cambios se aplican de inmediato."
    >
      {/* ── Sección 1: Planes ── */}
      <section aria-label="Planes de membresía">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Planes de membresía</h2>
          <span className="text-[11.5px] text-muted-foreground">{plans.length} planes</span>
        </div>

        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-dashed border-orange/50 bg-orange/5 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Los importes son propuesta comercial hasta su confirmación.
          </p>
        </div>

        <div className="mt-3 space-y-3">
          {plansQ.isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Cargando planes">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : plansQ.isError ? (
            <EmptyState
              icon={<Ticket className="h-8 w-8" aria-hidden />}
              title="No se pudo cargar los planes"
              hint="Comprueba la conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => plansQ.refetch()}
            />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<Ticket className="h-8 w-8" aria-hidden />}
              title="Sin planes configurados"
              hint="Los planes de membresía se administran desde el backend y aparecerán aquí."
            />
          ) : (
            plans.map((p) => (
              <article key={p.id} className="rounded-2xl border border-line bg-card p-4">
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
                      disabled={savePlan.isPending}
                      onCheckedChange={(v) => savePlan.mutate({ ...p, isActive: v })}
                      aria-label={`Activar o desactivar el plan ${p.name}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openPlanEdit(p)}
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
            ))
          )}
        </div>
      </section>

      {/* ── Sección 2: Herramientas ── */}
      <section className="mt-6" aria-label="Herramientas y permisos">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Herramientas y permisos</h2>
          <span className="text-[11.5px] text-muted-foreground">{tools.length} herramientas</span>
        </div>

        <div className="mt-3 space-y-3">
          {toolsQ.isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Cargando herramientas">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : toolsQ.isError ? (
            <EmptyState
              icon={<Wrench className="h-8 w-8" aria-hidden />}
              title="No se pudo cargar las herramientas"
              hint="Comprueba la conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => toolsQ.refetch()}
            />
          ) : tools.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-8 w-8" aria-hidden />}
              title="Sin herramientas configuradas"
              hint="El catálogo de herramientas se administra desde el backend y aparecerá aquí."
            />
          ) : (
            tools.map((t) => (
              <article key={t.id} className="rounded-2xl border border-line bg-card p-4">
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
                      disabled={saveTool.isPending}
                      onCheckedChange={(v) => saveTool.mutate({ ...t, isActive: v })}
                      aria-label={`Activar o desactivar la herramienta ${t.name}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openToolEdit(t)}
                    >
                      Editar
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-navy">
                    Plan mínimo: {minPlanLabel(t.minPlanCode)}
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
            ))
          )}
        </div>
      </section>

      {/* ── Diálogo: editar plan ── */}
      <Dialog open={planEditing !== null} onOpenChange={(open) => !open && (setPlanEditing(null), setPlanForm(null))}>
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
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-desc">Descripción</Label>
                <Textarea
                  id="plan-desc"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
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
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
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
                    onChange={(e) => setPlanForm({ ...planForm, priceCup: e.target.value })}
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
                    onChange={(e) => setPlanForm({ ...planForm, permanenceCredits: e.target.value })}
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
                    onChange={(e) => setPlanForm({ ...planForm, toolCredits: e.target.value })}
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
                  onCheckedChange={(v) => setPlanForm({ ...planForm, isActive: v })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (setPlanEditing(null), setPlanForm(null))}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full"
              disabled={!planValid || savePlan.isPending}
              onClick={submitPlan}
            >
              {savePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: editar herramienta ── */}
      <Dialog open={toolEditing !== null} onOpenChange={(open) => !open && (setToolEditing(null), setToolForm(null))}>
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
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="tool-tag">Etiqueta</Label>
                  <Input
                    id="tool-tag"
                    value={toolForm.tag}
                    onChange={(e) => setToolForm({ ...toolForm, tag: e.target.value })}
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
                    onChange={(e) => setToolForm({ ...toolForm, creditCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Plan mínimo</Label>
                <Select
                  value={toolForm.minPlanCode ?? 'none'}
                  onValueChange={(v) => setToolForm({ ...toolForm, minPlanCode: v === 'none' ? null : v })}
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
                  onChange={(e) => setToolForm({ ...toolForm, blockedMessage: e.target.value })}
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
                  onCheckedChange={(v) => setToolForm({ ...toolForm, requiresActiveMembership: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-secondary/50 px-3.5 py-2.5">
                <Label htmlFor="tool-active" className="text-[13px]">
                  Herramienta activa
                </Label>
                <Switch
                  id="tool-active"
                  checked={toolForm.isActive}
                  onCheckedChange={(v) => setToolForm({ ...toolForm, isActive: v })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (setToolEditing(null), setToolForm(null))}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full"
              disabled={!toolValid || saveTool.isPending}
              onClick={submitTool}
            >
              {saveTool.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminScreen>
  )
}
