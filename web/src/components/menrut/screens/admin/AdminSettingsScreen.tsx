// MENRUT — Administración · Configuración general
'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings2, Info, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { AdminScreen } from '@/components/menrut/screens/admin/_AdminNav'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// Metadatos de las claves conocidas (solo se muestran las que llegan del backend)
interface ConfigKeyMeta {
  key: string
  label: string
  hint?: string
  kind: 'number' | 'text' | 'select'
  options?: string[]
}

const KNOWN_KEYS: ConfigKeyMeta[] = [
  {
    key: 'trial_days',
    label: 'Días de prueba gratuita',
    hint: 'Duración de la prueba para cuentas nuevas.',
    kind: 'number',
  },
  {
    key: 'trial_permanence_credits',
    label: 'Créditos de permanencia de la prueba',
    hint: 'Se otorgan una sola vez por cuenta.',
    kind: 'number',
  },
  { key: 'credits_per_12h', label: 'Créditos consumidos cada 12 horas', kind: 'number' },
  { key: 'credits_per_24h', label: 'Créditos consumidos cada 24 horas', kind: 'number' },
  {
    key: 'renewal_mode',
    label: 'Modo de renovación de permanencia',
    hint: 'add = los créditos nuevos se suman a los existentes.',
    kind: 'select',
    options: ['add', 'carry', 'none'],
  },
  {
    key: 'tool_credits_expiry_mode',
    label: 'Vencimiento de créditos de herramientas',
    hint: 'carry = los créditos se conservan al vencer la membresía.',
    kind: 'select',
    options: ['carry', 'add', 'none'],
  },
  { key: 'app_slogan', label: 'Eslogan de la aplicación', kind: 'text' },
]

export default function AdminSettingsScreen() {
  const session = useAppStore((s) => s.session)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.adminConfig(),
    enabled: !!session,
  })

  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  // Instantánea del último estado del servidor recibido (para reiniciar el borrador
  // cuando llegan datos nuevos, sin usar efectos — patrón de ajuste en render)
  const [snapshot, setSnapshot] = useState<Record<string, string> | null>(null)

  if (data?.config && data.config !== snapshot) {
    setSnapshot(data.config)
    setDraft(data.config)
  }

  const saveMutation = useMutation({
    mutationFn: (config: Record<string, string>) => api.adminSaveConfig(config),
    onSuccess: () => {
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['admin-config'] })
    },
    onError: (err: Error) =>
      toast.error(err.message || 'No se pudo guardar la configuración. Inténtalo de nuevo.'),
  })

  const serverConfig = data?.config
  const dirty =
    !!draft &&
    !!serverConfig &&
    (Object.keys(draft).length !== Object.keys(serverConfig).length ||
      Object.keys(draft).some((k) => draft[k] !== serverConfig[k]))

  const update = (key: string, value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  // Claves conocidas primero (en orden de producto), luego cualquier clave extra que llegue
  const entries: ConfigKeyMeta[] = draft
    ? [
        ...KNOWN_KEYS.filter((m) => m.key in draft),
        ...Object.keys(draft)
          .filter((key) => !KNOWN_KEYS.some((m) => m.key === key))
          .map<ConfigKeyMeta>((key) => ({ key, label: key, kind: 'text' })),
      ]
    : []

  return (
    <AdminScreen
      active="admin-settings"
      title="Configuración general"
      subtitle="Parámetros centrales del sistema de créditos y textos del producto."
    >
      {/* Nota de impacto */}
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-line bg-secondary/60 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Estos valores controlan las reglas del sistema de créditos. Revísalos antes de guardar:
          se aplican a todas las cuentas.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando configuración">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : isError || !draft ? (
        <EmptyState
          icon={<Settings2 className="h-8 w-8" aria-hidden />}
          title="No se pudo cargar la configuración"
          hint="Comprueba la conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Settings2 className="h-8 w-8" aria-hidden />}
          title="Sin claves de configuración disponibles"
          hint="El backend todavía no expone parámetros configurables."
        />
      ) : (
        <>
          <div className="space-y-4">
            {entries.map((m) => (
              <div key={m.key} className="grid gap-1.5">
                <Label htmlFor={`cfg-${m.key}`}>{m.label}</Label>
                {m.kind === 'select' ? (
                  <Select value={draft[m.key]} onValueChange={(v) => update(m.key, v)}>
                    <SelectTrigger id={`cfg-${m.key}`} className="w-full">
                      <SelectValue placeholder="Selecciona un valor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(m.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                      {/* Valor actual del servidor si no está entre las opciones conocidas */}
                      {draft[m.key] && !m.options?.includes(draft[m.key]) ? (
                        <SelectItem value={draft[m.key]}>{draft[m.key]}</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`cfg-${m.key}`}
                    type={m.kind === 'number' ? 'number' : 'text'}
                    inputMode={m.kind === 'number' ? 'numeric' : undefined}
                    value={draft[m.key]}
                    onChange={(e) => update(m.key, e.target.value)}
                    className="rounded-xl"
                  />
                )}
                {m.hint ? (
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{m.hint}</p>
                ) : null}
                <p className="font-mono text-[10.5px] text-muted-foreground/70">{m.key}</p>
              </div>
            ))}
          </div>

          <Button
            className="mt-6 h-12 w-full rounded-full"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => draft && saveMutation.mutate(draft)}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {dirty ? 'Guardar cambios' : 'Sin cambios que guardar'}
          </Button>
        </>
      )}
    </AdminScreen>
  )
}
