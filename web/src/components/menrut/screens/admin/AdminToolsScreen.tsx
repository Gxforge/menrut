// MENRUT — Administración · Planes y herramientas
'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Wrench, Ticket, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { PlanCard } from '@/components/menrut/screens/admin/AdminToolsPieces/PlanCard'
import { ToolCard } from '@/components/menrut/screens/admin/AdminToolsPieces/ToolCard'
import { PlanEditDialog } from '@/components/menrut/screens/admin/AdminToolsPieces/PlanEditDialog'
import { ToolEditDialog } from '@/components/menrut/screens/admin/AdminToolsPieces/ToolEditDialog'
import {
  PlanFormState, ToolFormState, isNonNegative,
} from '@/components/menrut/screens/admin/AdminToolsPieces/formState'
import type { PlanDto, ToolDto } from '@/lib/types'

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

  const closePlanDialog = () => {
    setPlanEditing(null)
    setPlanForm(null)
  }

  const closeToolDialog = () => {
    setToolEditing(null)
    setToolForm(null)
  }

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
              <PlanCard
                key={p.id}
                plan={p}
                saving={savePlan.isPending}
                onEdit={openPlanEdit}
                onToggleActive={(plan, v) => savePlan.mutate({ ...plan, isActive: v })}
              />
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
              <ToolCard
                key={t.id}
                tool={t}
                plans={plans}
                saving={saveTool.isPending}
                onEdit={openToolEdit}
                onToggleActive={(tool, v) => saveTool.mutate({ ...tool, isActive: v })}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Diálogo: editar plan ── */}
      <PlanEditDialog
        planEditing={planEditing}
        planForm={planForm}
        onPlanFormChange={setPlanForm}
        valid={planValid}
        saving={savePlan.isPending}
        onSubmit={submitPlan}
        onClose={closePlanDialog}
      />

      {/* ── Diálogo: editar herramienta ── */}
      <ToolEditDialog
        toolEditing={toolEditing}
        toolForm={toolForm}
        plans={plans}
        onToolFormChange={setToolForm}
        valid={toolValid}
        saving={saveTool.isPending}
        onSubmit={submitTool}
        onClose={closeToolDialog}
      />
    </AdminScreen>
  )
}
