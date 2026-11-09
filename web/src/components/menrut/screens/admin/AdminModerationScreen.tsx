// MENRUT — Administración · Moderación y auditoría
'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Flag, ScrollText, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { formatDateTime } from '@/lib/format'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState, ListSkeleton } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { AuditLogDto, ReportFlagDto } from '@/lib/types'

// Tipo de contenido reportado (perfil / valoración / conversación)
const TARGET_META: Record<string, { label: string; cls: string }> = {
  profile: { label: 'Perfil', cls: 'bg-blue/10 text-blue' },
  review: { label: 'Valoración', cls: 'bg-orange/10 text-orange' },
  conversation: { label: 'Conversación', cls: 'bg-cyan/10 text-cyan' },
}

function TargetChip({ type }: { type: string }) {
  const meta = TARGET_META[type] ?? { label: type, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.cls)}>
      {meta.label}
    </span>
  )
}

function ReportStatusChip({ status }: { status: string }) {
  if (status === 'reviewed') {
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
        Atendido
      </span>
    )
  }
  if (status === 'dismissed') {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        Descartado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
      Abierto
    </span>
  )
}

// Color del chip de acción según su tipo (texto real de la auditoría)
function AuditActionChip({ action }: { action: string }) {
  const a = action.toLowerCase()
  let cls = 'bg-muted text-muted-foreground'
  if (a.includes('reject') || a.includes('suspend') || a.includes('delete')) {
    cls = 'bg-danger/10 text-danger'
  } else if (a.includes('approve') || a.includes('verify') || a.includes('review')) {
    cls = 'bg-success/10 text-success'
  } else if (a.includes('save') || a.includes('update') || a.includes('config') || a.includes('plan') || a.includes('tool')) {
    cls = 'bg-blue/10 text-blue'
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold', cls)}>
      {action}
    </span>
  )
}

function ReportCard({
  report,
  saving,
  onResolve,
}: {
  report: ReportFlagDto
  saving: boolean
  onResolve: (id: string, status: 'reviewed' | 'dismissed') => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">Reportado por {report.reporterName}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{formatDateTime(report.createdAt)}</p>
        </div>
        <ReportStatusChip status={report.status} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <TargetChip type={report.targetType} />
        <span className="truncate text-[11px] text-muted-foreground">ID {report.targetId}</span>
      </div>
      <p className="mt-2.5 rounded-xl bg-secondary/60 px-3 py-2 text-[12.5px] leading-relaxed">
        {report.reason}
      </p>
      {report.status === 'open' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full bg-success text-white hover:bg-success/90"
            disabled={saving}
            onClick={() => onResolve(report.id, 'reviewed')}
          >
            Atendido
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={saving}
            onClick={() => onResolve(report.id, 'dismissed')}
          >
            Descartar
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function AuditItem({ log }: { log: AuditLogDto }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <AuditActionChip action={log.action} />
        <span className="shrink-0 text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</span>
      </div>
      <p className="mt-2 text-[13px] font-semibold">{log.actorName}</p>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
        {log.entityType} · {log.entityId}
      </p>
      {log.detail ? (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
          {log.detail}
        </p>
      ) : null}
    </article>
  )
}

export default function AdminModerationScreen() {
  const session = useAppStore((s) => s.session)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'reports' | 'audit'>('reports')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: () => api.adminModeration(),
    enabled: !!session,
  })

  const resolveMutation = useMutation({
    mutationFn: (v: { id: string; status: 'reviewed' | 'dismissed' }) =>
      api.adminResolveReport(v.id, v.status),
    onSuccess: (_res, v) => {
      toast.success(v.status === 'reviewed' ? 'Reporte marcado como atendido' : 'Reporte descartado')
      qc.invalidateQueries({ queryKey: ['admin-moderation'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      qc.invalidateQueries({ queryKey: ['admin-accounts'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'No se pudo actualizar el reporte. Inténtalo de nuevo.'),
  })

  const reports = data?.reports ?? []
  const audit = data?.audit ?? []
  const openCount = reports.filter((r) => r.status === 'open').length

  // Abiertos primero, luego el resto; ambos por fecha descendente
  const sortedReports = [...reports].sort((a, b) => {
    const ao = a.status === 'open' ? 0 : 1
    const bo = b.status === 'open' ? 0 : 1
    if (ao !== bo) return ao - bo
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const sortedAudit = [...audit].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <AdminScreen
      active="admin-moderation"
      title="Moderación y auditoría"
      subtitle="Reportes de la comunidad y trazabilidad de las acciones administrativas."
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'reports' | 'audit')}>
        <TabsList className="w-full">
          <TabsTrigger value="reports" className="flex-1 gap-1.5">
            Reportes
            {openCount > 0 ? (
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {openCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1">
            Auditoría
          </TabsTrigger>
        </TabsList>

        {/* ── Reportes ── */}
        <TabsContent value="reports" className="mt-4">
          {isLoading ? (
            <ListSkeleton count={3} />
          ) : isError ? (
            <EmptyState
              icon={<Flag className="h-8 w-8" aria-hidden />}
              title="No se pudo cargar los reportes"
              hint="Comprueba la conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => refetch()}
            />
          ) : sortedReports.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
              title="Sin reportes abiertos"
              hint="Cuando la comunidad reporte perfiles, valoraciones o conversaciones, aparecerán aquí para revisión."
            />
          ) : (
            <div className="space-y-3">
              {sortedReports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  saving={resolveMutation.isPending}
                  onResolve={(id, status) => resolveMutation.mutate({ id, status })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Auditoría ── */}
        <TabsContent value="audit" className="mt-4">
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : isError ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" aria-hidden />}
              title="No se pudo cargar la auditoría"
              hint="Comprueba la conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => refetch()}
            />
          ) : sortedAudit.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" aria-hidden />}
              title="Sin eventos aún"
              hint="Las acciones administrativas (verificaciones, pagos, planes, configuración) quedarán registradas aquí."
            />
          ) : (
            <div className="space-y-3">
              {sortedAudit.map((log) => (
                <AuditItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminScreen>
  )
}
