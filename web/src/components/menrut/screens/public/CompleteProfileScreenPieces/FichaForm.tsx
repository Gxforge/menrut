// MENRUT — CompleteProfileScreen · formulario de la ficha profesional.
// Estado fresco por courier: el padre lo monta con `key` para reiniciarlo.
'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Briefcase, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopBar } from '@/components/menrut/core/TopBar'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { uploadToBucket } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { CoverageType, PassportDto } from '@/lib/types'
import { type CourierProfilePatch, SERVICE_KEYS, type ServiceKey } from './data'
import { TipoSelector } from './TipoSelector'
import { AboutSection } from './AboutSection'
import { VerificationSection } from './VerificationSection'

// ─── Formulario (estado fresco por courier con `key`) ────────────────────────

export function FichaForm({
  courierId,
  currentType,
  initial,
}: {
  courierId: string | null
  currentType: CoverageType
  initial: PassportDto | null
}) {
  const resetTo = useAppStore((s) => s.resetTo)
  const qc = useQueryClient()

  // ¿Cómo trabajas? · el tipo se elige explícitamente. Si la ficha ya se
  // completó antes (bio con contenido), se precarga el tipo guardado.
  const [tipo, setTipo] = useState<CoverageType | null>(() =>
    initial && initial.bio.trim().length >= 10 ? currentType : null
  )

  // ─── Sobre ti (precargados del pasaporte propio) ──────────────────────────
  const [bio, setBio] = useState(() => initial?.bio ?? '')
  const [years, setYears] = useState(() =>
    initial && initial.yearsExperience > 0 ? String(initial.yearsExperience) : ''
  )
  const [vehicle, setVehicle] = useState(() => initial?.vehicleSummary ?? '')
  const [services, setServices] = useState<ServiceKey[]>(() =>
    (initial?.services ?? []).filter((s): s is ServiceKey =>
      (SERVICE_KEYS as readonly string[]).includes(s)
    )
  )
  const [availability, setAvailability] = useState(() => initial?.availabilityNote ?? '')
  const [baseFee, setBaseFee] = useState(() =>
    initial && initial.feeCup !== null && initial.feeCup !== undefined ? String(initial.feeCup) : ''
  )

  // ─── Verificación ──────────────────────────────────────────────────────────
  const [verifNote, setVerifNote] = useState('')
  const [verifFile, setVerifFile] = useState<File | null>(null)
  const [verifSent, setVerifSent] = useState(initial?.verificationStatus === 'pending')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [sendingVerif, setSendingVerif] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Zona base del mensajero (cobertura real de su pasaporte; p. ej. «Santa Clara»).
  const coverageNames = initial?.coverage ?? []
  const zonaBase = coverageNames.length === 1 ? coverageNames[0] : null

  function toggleService(key: ServiceKey) {
    setServices((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!tipo) next.tipo = 'Elige cómo trabajas para continuar.'
    if (bio.trim().length < 10) next.bio = 'Cuéntanos algo más sobre ti (al menos 10 caracteres).'
    if (services.length === 0) next.services = 'Selecciona al menos un servicio.'
    if (years.trim() !== '') {
      const n = Number(years)
      if (!Number.isInteger(n) || n < 0 || n > 60) next.years = 'Indica entre 0 y 60 años.'
    }
    if (baseFee.trim() !== '') {
      const f = Number(baseFee)
      if (!Number.isFinite(f) || f < 0) next.baseFee = 'Indica una tarifa válida en CUP.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (saving) return
    if (!validate()) return
    setSaving(true)
    try {
      const payload: CourierProfilePatch = {
        bio: bio.trim(),
        coverageType: tipo ?? undefined,
        yearsExperience: years.trim() === '' ? undefined : Number(years),
        vehicleSummary: vehicle.trim() || undefined,
        availabilityNote: availability.trim() || undefined,
        baseFeeCup: baseFee.trim() === '' ? null : Number(baseFee),
        services,
      }
      await api.updateCourierProfile(payload)
      // El tipo condiciona búsquedas, pasaporte y rutas: refresca las cachés.
      if (courierId) void qc.invalidateQueries({ queryKey: ['passport', courierId] })
      void qc.invalidateQueries({ queryKey: ['courier-dashboard'] })
      void qc.invalidateQueries({ queryKey: ['search'] })
      void qc.invalidateQueries({ queryKey: ['favorites'] })
      toast.success('Perfil actualizado')
      resetTo('courier-home')
    } catch (e) {
      toast.error(
        (e instanceof Error && e.message) ||
          'No se pudo guardar el perfil. Revisa tu conexión e inténtalo de nuevo.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSendVerification() {
    if (sendingVerif) return
    if (verifNote.trim().length < 10) {
      setErrors((e) => ({ ...e, verifNote: 'Añade una nota breve para el equipo (al menos 10 caracteres).' }))
      return
    }
    setErrors(({ verifNote: _omit, ...rest }) => rest)
    setSendingVerif(true)
    try {
      let documentUrl: string | undefined
      if (verifFile) {
        try {
          documentUrl = await uploadToBucket('private-documents', verifFile, 'verifications')
        } catch {
          // El documento es opcional: la nota se envía igual.
          toast.warning('No se pudo subir el documento. Enviaremos solo tu nota.')
        }
      }
      await api.submitVerification({ note: verifNote.trim(), documentUrl })
      setVerifSent(true)
      toast.success('Solicitud enviada. El equipo MENRUT revisará tu verificación.')
    } catch {
      toast.error('No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos.')
    } finally {
      setSendingVerif(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Completar perfil profesional"
        subtitle="Estos datos se muestran en tu pasaporte"
        onBack={() => {
          const s = useAppStore.getState()
          const prev = s.history[s.history.length - 1]
          // Venimos del registro/login: no volver al formulario de acceso.
          if (prev && ['login', 'register', 'recovery', 'splash'].includes(prev)) {
            s.resetTo('courier-home')
          } else if (s.history.length > 0) {
            s.back()
          } else {
            s.resetTo('courier-home')
          }
        }}
      />

      <div className="space-y-6 px-4 pb-10 pt-4">
        {/* ── ¿Cómo trabajas? (se pregunta PRIMERO) ───────────────────────── */}
        <TipoSelector
          tipo={tipo}
          onSelect={setTipo}
          error={errors.tipo}
          zonaBase={zonaBase}
          cobertura={coverageNames}
        />

        {/* ── Sobre ti ──────────────────────────────────────────────────────── */}
        <AboutSection
          bio={bio}
          onBioChange={setBio}
          years={years}
          onYearsChange={setYears}
          baseFee={baseFee}
          onBaseFeeChange={setBaseFee}
          vehicle={vehicle}
          onVehicleChange={setVehicle}
          availability={availability}
          onAvailabilityChange={setAvailability}
          services={services}
          onToggleService={toggleService}
          errors={errors}
        />

        {/* ── Verificación de identidad ─────────────────────────────────────── */}
        <VerificationSection
          note={verifNote}
          onNoteChange={setVerifNote}
          file={verifFile}
          onFileChange={setVerifFile}
          sent={verifSent}
          sending={sendingVerif}
          error={errors.verifNote}
          onSubmit={handleSendVerification}
          fileInputRef={fileInputRef}
        />

        <p className="flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          La experiencia, el vehículo y la disponibilidad se muestran en tu pasaporte como datos
          declarados por ti.
        </p>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 w-full rounded-full text-[15px] font-bold"
        >
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </Button>
      </div>
    </div>
  )
}
