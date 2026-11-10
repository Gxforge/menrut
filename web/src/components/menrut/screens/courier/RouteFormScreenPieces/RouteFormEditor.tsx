// MENRUT — RouteFormScreen · Editor del formulario por pasos (1-2-3).
// Recibe la ruta en edición (o null para crear), el catálogo de provincias
// y el scope del trayecto; el estado del formulario vive aquí.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { Stepper } from './Stepper'
import { ScopeNotice } from './ScopeNotice'
import { TerritoryStep } from './TerritoryStep'
import { ServiceStep } from './ServiceStep'
import { DetailsStep } from './DetailsStep'
import { FormActions } from './FormActions'
import {
  desdeRuta, municipiosDe, parseFee,
  type FormState, type Scope,
} from './helpers'
import type { ProvinceDto, RouteDto } from '@/lib/types'

export function RouteFormEditor({
  route,
  provinces,
  scope,
}: {
  route: RouteDto | null
  provinces: ProvinceDto[]
  scope: Scope
}) {
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const setEditingRoute = useAppStore((s) => s.setEditingRoute)
  const qc = useQueryClient()
  const editingRouteId = route?.id ?? null
  const editando = route !== null

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(() => desdeRuta(route, provinces))
  const [error, setError] = useState<string | null>(null)

  const munById = useMemo(() => {
    const m = new Map<string, { name: string; province: string }>()
    for (const p of provinces) for (const mu of p.municipalities) m.set(mu.id, { name: mu.name, province: p.name })
    return m
  }, [provinces])

  const provById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of provinces) m.set(p.id, p.name)
    return m
  }, [provinces])

  // Volver arriba al cambiar de paso
  useEffect(() => {
    document.getElementById('contenido')?.scrollTo({ top: 0 })
  }, [step])

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  // ── Validaciones por paso (el paso 1 depende del scope) ───────────────
  const validar = (n: number): string | null => {
    if (n === 1) {
      if (scope === 'provincial') {
        if (!form.originProvince) return 'Selecciona la provincia de origen.'
        if (!form.destProvince) return 'Selecciona la provincia de destino.'
        if (form.originProvince === form.destProvince) return 'El origen y el destino no pueden ser la misma provincia.'
      } else {
        if (!form.originProvince || !form.originId) return 'Selecciona la provincia y el municipio de origen.'
        if (!form.destProvince || !form.destId) return 'Selecciona la provincia y el municipio de destino.'
        if (form.originId === form.destId) return 'El origen y el destino no pueden ser el mismo municipio.'
      }
    }
    if (n === 2) {
      if (!form.frequency) return 'Selecciona la frecuencia del recorrido.'
      if (!form.vehicleType) return 'Selecciona el vehículo con el que realizas el trayecto.'
    }
    return null
  }

  const irAPaso = (n: number) => {
    const err = validar(step)
    if (err) {
      setError(err)
      toast.error(err)
      return
    }
    setError(null)
    setStep(n)
  }

  // ── Guardar (crear o actualizar) ──────────────────────────────────────
  // municipal → originId/destinationId (municipios)
  // provincial → originProvinceId/destinationProvinceId (provincias)
  const saveQ = useMutation({
    mutationFn: () => {
      const fee = parseFee(form.feeCup)
      if (Number.isNaN(fee)) {
        throw new Error('La tarifa debe ser un número entero en CUP (o déjala vacía para acordarla con el cliente).')
      }
      const territorio =
        scope === 'provincial'
          ? { originProvinceId: form.originProvince, destinationProvinceId: form.destProvince }
          : { originId: form.originId, destinationId: form.destId }
      const payload = {
        ...territorio,
        stops: form.stops.trim(),
        frequency: form.frequency,
        daysNote: form.daysNote.trim(),
        serviceType: form.serviceType,
        vehicleType: form.vehicleType,
        feeCup: fee,
        nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
        notes: form.notes.trim(),
      }
      return editingRouteId
        ? api.updateRoute(editingRouteId, payload)
        : api.createRoute(payload)
    },
    onSuccess: () => {
      toast.success(editando ? 'Ruta actualizada.' : 'Ruta publicada. Ya la ven los clientes de ese trayecto.')
      setEditingRoute(null)
      void qc.invalidateQueries({ queryKey: ['courier-routes'] })
      void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
      void qc.invalidateQueries({ queryKey: ['search'] })
      void qc.invalidateQueries({ queryKey: ['popular-routes'] })
      navigate('courier-routes')
    },
    onError: (e: Error) => {
      // El backend valida duplicados y territorios por tipo; su mensaje se
      // muestra tal cual (p. ej. 400 de zona o de formato equivocado).
      toast.error(e.message || 'No se pudo guardar la ruta. Inténtalo de nuevo.')
    },
  })

  // Vista previa sintetizada con los datos ingresados
  const feePreview = parseFee(form.feeCup)
  const lista = form.frequency && form.vehicleType && !Number.isNaN(feePreview)
  const previewRoute: RouteDto | null =
    scope === 'provincial'
      ? lista && form.originProvince && form.destProvince
        ? {
            id: editingRouteId ?? 'preview',
            origin: provById.get(form.originProvince) ?? '',
            destination: provById.get(form.destProvince) ?? '',
            originId: null,
            destinationId: null,
            originProvinceId: form.originProvince,
            destinationProvinceId: form.destProvince,
            scope: 'provincial',
            stops: form.stops.trim(),
            frequency: form.frequency ?? 'personalizada',
            daysNote: form.daysNote.trim(),
            serviceType: form.serviceType,
            vehicleType: form.vehicleType ?? 'motor',
            feeCup: feePreview,
            status: 'active',
            nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
            notes: form.notes.trim(),
          }
        : null
      : lista && form.originId && form.destId
        ? {
            id: editingRouteId ?? 'preview',
            origin: munById.get(form.originId)?.name ?? '',
            destination: munById.get(form.destId)?.name ?? '',
            originId: form.originId,
            destinationId: form.destId,
            originProvinceId: null,
            destinationProvinceId: null,
            scope: 'municipal',
            stops: form.stops.trim(),
            frequency: form.frequency ?? 'personalizada',
            daysNote: form.daysNote.trim(),
            serviceType: form.serviceType,
            vehicleType: form.vehicleType ?? 'motor',
            feeCup: feePreview,
            status: 'active',
            nextDepartureAt: form.nextDepartureAt ? new Date(form.nextDepartureAt).toISOString() : null,
            notes: form.notes.trim(),
          }
        : null

  const munOrigen = municipiosDe(provinces, form.originProvince)
  const munDestino = municipiosDe(provinces, form.destProvince)

  return (
    <div>
      <TopBar
        title={editando ? 'Editar ruta' : 'Publicar ruta'}
        subtitle="Comparte el trayecto que ofreces"
        onBack={back}
      />

      <div className="px-4 pt-4 pb-8">
        {/* Stepper 1-2-3 */}
        <Stepper step={step} />

        {/* Aviso del formato según el tipo de mensajero */}
        <ScopeNotice scope={scope} />

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </p>
        )}

        {/* ── Paso 1: origen y destino ─────────────────────────────── */}
        {step === 1 && (
          <TerritoryStep
            scope={scope}
            form={form}
            patch={patch}
            provinces={provinces}
            munOrigen={munOrigen}
            munDestino={munDestino}
          />
        )}

        {/* ── Paso 2: frecuencia y servicio ────────────────────────── */}
        {step === 2 && <ServiceStep form={form} patch={patch} />}

        {/* ── Paso 3: tarifa, salida, notas y vista previa ─────────── */}
        {step === 3 && <DetailsStep form={form} patch={patch} previewRoute={previewRoute} />}

        {/* Botonera */}
        <FormActions
          step={step}
          editando={editando}
          saving={saveQ.isPending}
          onPrev={() => {
            setError(null)
            setStep(step - 1)
          }}
          onNext={() => irAPaso(step + 1)}
          onSave={() => saveQ.mutate()}
        />

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          La tarifa y la disponibilidad las publicas tú. El cliente confirma contigo las condiciones finales.
        </p>
      </div>
    </div>
  )
}
