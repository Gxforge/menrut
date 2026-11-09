// MENRUT — Completar perfil profesional (mensajero)
// Datos profesionales + solicitud de verificación de identidad.
// Solo para sesiones de mensajero; el resto se redirige.
//
// T8-c (tipos de mensajero): la ficha pregunta PRIMERO «¿Cómo trabajas?»
// (en mi zona / entre municipios / entre provincias) y se adapta al tipo.
// Nunca se fuerza provincia→provincia: cada mensajero elige su realidad.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bike, Briefcase, CalendarClock, Check, CheckCircle2, Coins, Compass,
  FileImage, Globe, Loader2, MapPin, Paperclip, Route as RouteIcon, ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { TopBar } from '@/components/menrut/core/TopBar'
import { PendingSeal } from '@/components/menrut/core/StatusBadge'
import { EmptyState } from '@/components/menrut/core/EmptyState'
import { api } from '@/lib/api'
import { uploadToBucket } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { SERVICE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CoverageType, PassportDto } from '@/lib/types'

const SERVICE_KEYS = ['paquetes', 'encargos', 'entregas_comerciales', 'otros'] as const
type ServiceKey = (typeof SERVICE_KEYS)[number]

// ─── ¿Cómo trabajas? · opciones de tipo (corrección del propietario) ─────────
// zona: dentro de su municipio base · municipal: municipio a municipio
// provincial: provincia a provincia. La ficha nunca presupone un tipo.
const TIPO_OPCIONES: {
  value: CoverageType
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  ejemplo: string
}[] = [
  {
    value: 'zone',
    icon: MapPin,
    title: 'En mi zona',
    desc: 'Trabajo dentro de mi municipio',
    ejemplo: 'Ej.: Santa Clara, dentro del propio municipio',
  },
  {
    value: 'municipal',
    icon: RouteIcon,
    title: 'Entre municipios',
    desc: 'Viajo de municipio a municipio',
    ejemplo: 'Ej.: Camajuaní → Santa Clara',
  },
  {
    value: 'provincial',
    icon: Globe,
    title: 'Entre provincias',
    desc: 'Cubro rutas de provincia a provincia',
    ejemplo: 'Ej.: Villa Clara → La Habana',
  },
]

// PATCH /api/courier/me acepta además `coverageType` (contrato T8-a). El tipo
// público de api.updateCourierProfile aún no lo incluye, así que el campo extra
// se declara aquí y viaja en el mismo JSON del PATCH.
type CourierProfilePatch = Parameters<typeof api.updateCourierProfile>[0] & {
  coverageType?: CoverageType
}

export default function CompleteProfileScreen() {
  const session = useAppStore((s) => s.session)
  const hydrated = useAppStore((s) => s.hydrated)
  const resetTo = useAppStore((s) => s.resetTo)

  // Guardas: pantalla exclusiva de mensajeros
  useEffect(() => {
    if (!hydrated) return
    if (!session) {
      resetTo('welcome')
    } else if (session.role === 'client' || session.role === 'business') {
      resetTo('home')
    } else if (session.role === 'admin' || session.role === 'owner' || session.role === 'moderator') {
      resetTo('admin-home')
    }
  }, [hydrated, session, resetTo])

  // Dashboard: tipo actual + courierId (para precargar la propia ficha).
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session && session.role === 'courier',
  })

  // Pasaporte propio: precarga de la ficha (bio, servicios, cobertura…).
  // El dueño siempre puede verlo, aunque su perfil esté oculto.
  const courierId = dashQ.data?.courierId ?? null
  const passportQ = useQuery({
    queryKey: ['passport', courierId],
    queryFn: () => api.passport(courierId ?? ''),
    enabled: !!courierId,
    staleTime: 60_000,
    retry: 1,
  })

  if (!hydrated || !session || session.role !== 'courier') {
    // Guarda actuando: nada que pintar hasta resolver el destino.
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue" aria-label="Cargando" />
      </div>
    )
  }

  // ── Carga ────────────────────────────────────────────────────────────────
  if (dashQ.isPending) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Completar perfil profesional" subtitle="Estos datos se muestran en tu pasaporte" />
        <div className="space-y-4 px-4 pb-10 pt-4" aria-busy="true" aria-label="Cargando ficha">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (dashQ.isError || !dashQ.data) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Completar perfil profesional" subtitle="Estos datos se muestran en tu pasaporte" />
        <div className="px-4 pt-6 pb-8">
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" aria-hidden />}
            title="No se pudo cargar tu ficha"
            hint="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => void dashQ.refetch()}
          />
        </div>
      </div>
    )
  }

  // La precarga del pasaporte es un detalle: si falla, la ficha arranca vacía.
  const initial: PassportDto | null = passportQ.data ?? null

  return (
    <FichaForm
      key={courierId ?? 'nueva'}
      courierId={courierId}
      currentType={dashQ.data.coverageType}
      initial={initial}
    />
  )
}

// ─── Formulario (estado fresco por courier con `key`) ────────────────────────

function FichaForm({
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
          if (prev && ['login', 'register', 'recovery', 'welcome', 'splash'].includes(prev)) {
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
        <section aria-labelledby="cp-tipo" className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="cp-tipo" className="section-title flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue" aria-hidden />
              ¿Cómo trabajas?
            </h2>
            <span className="text-[11px] font-semibold text-muted-foreground">Obligatorio</span>
          </div>

          <div role="radiogroup" aria-labelledby="cp-tipo" className="space-y-2.5">
            {TIPO_OPCIONES.map((opt) => {
              const Icon = opt.icon
              const active = tipo === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTipo(opt.value)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99]',
                    active
                      ? 'border-blue bg-blue/5 ring-1 ring-blue/30'
                      : 'border-line bg-card hover:border-blue/40'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      active ? 'bg-blue text-white' : 'bg-blue/10 text-blue'
                    )}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-tight text-foreground">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
                      {opt.desc}
                    </span>
                    <span className="mt-1 block text-[11.5px] font-medium leading-snug text-blue">
                      {opt.ejemplo}
                    </span>
                  </span>
                  {active && <Check className="mt-1 h-5 w-5 shrink-0 text-blue" aria-hidden />}
                </button>
              )
            })}
          </div>
          {errors.tipo && (
            <p role="alert" className="text-xs font-medium text-danger">{errors.tipo}</p>
          )}

          {/* La ficha se adapta al tipo elegido */}
          {tipo && <TipoInfoCard tipo={tipo} zonaBase={zonaBase} cobertura={coverageNames} />}
        </section>

        {/* ── Sobre ti ──────────────────────────────────────────────────────── */}
        <section aria-labelledby="cp-about" className="space-y-3">
          <h2 id="cp-about" className="section-title flex items-center gap-2">
            <UserRound className="h-4 w-4 text-blue" aria-hidden />
            Sobre ti
          </h2>
          <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-bio">Presentación</Label>
              <Textarea
                id="cp-bio"
                rows={3}
                placeholder="Ej.: Mensajero responsable, especializado en trayectos Habana–Matanzas."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                aria-invalid={!!errors.bio}
                className="rounded-xl"
              />
              {errors.bio && <p className="text-xs text-danger">{errors.bio}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-years">Años de experiencia</Label>
                <Input
                  id="cp-years"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  placeholder="5"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  aria-invalid={!!errors.years}
                  className="h-11 rounded-xl"
                />
                {errors.years && <p className="text-xs text-danger">{errors.years}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-fee">Tarifa base (CUP)</Label>
                <div className="relative">
                  <Coins
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="cp-fee"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Opcional"
                    value={baseFee}
                    onChange={(e) => setBaseFee(e.target.value)}
                    aria-invalid={!!errors.baseFee}
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
                {errors.baseFee && <p className="text-xs text-danger">{errors.baseFee}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-vehicle">Vehículo principal</Label>
              <div className="relative">
                <Bike
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="cp-vehicle"
                  placeholder="Ej.: Motor Honda"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-availability">Disponibilidad declarada</Label>
              <div className="relative">
                <CalendarClock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="cp-availability"
                  placeholder="Ej.: Lunes a viernes, mañanas"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold">Servicios que ofreces</legend>
              <div className="flex flex-wrap gap-2">
                {SERVICE_KEYS.map((key) => {
                  const active = services.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleService(key)}
                      aria-pressed={active}
                      className={cn(
                        'min-h-[36px] rounded-full border px-3.5 text-[12.5px] font-semibold transition-all active:scale-95',
                        active
                          ? 'border-blue bg-blue text-white'
                          : 'border-line bg-secondary/60 text-navy hover:border-blue/40'
                      )}
                    >
                      {SERVICE_LABELS[key]}
                    </button>
                  )
                })}
              </div>
              {errors.services && <p className="text-xs text-danger">{errors.services}</p>}
            </fieldset>
          </div>
        </section>

        {/* ── Verificación de identidad ─────────────────────────────────────── */}
        <section aria-labelledby="cp-verify" className="space-y-3">
          <h2 id="cp-verify" className="section-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue" aria-hidden />
            Verificación de identidad
          </h2>

          <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
            <div className="flex gap-3 rounded-xl bg-secondary/70 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue" aria-hidden />
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                El sello «Identidad verificada» lo revisa y otorga el equipo MENRUT. Tus documentos se
                guardan de forma privada y <strong className="text-foreground">nunca se publican</strong> en
                tu pasaporte.
              </p>
            </div>

            {verifSent ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-success/10 px-4 py-5 text-center" role="status">
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
                <p className="font-display text-[14px] font-semibold">Solicitud enviada</p>
                <PendingSeal />
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Te avisaremos por notificación cuando la revisión termine.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cp-verif-note">Nota para el equipo</Label>
                  <Textarea
                    id="cp-verif-note"
                    rows={3}
                    placeholder="Ej.: Mensajero de La Habana, puedo mostrar carné en una videollamada."
                    value={verifNote}
                    onChange={(e) => setVerifNote(e.target.value)}
                    aria-invalid={!!errors.verifNote}
                    className="rounded-xl"
                  />
                  {errors.verifNote && <p className="text-xs text-danger">{errors.verifNote}</p>}
                </div>

                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/webp,image/jpeg,.webp,.jpg,.jpeg"
                    className="sr-only"
                    onChange={(e) => setVerifFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-full text-[13px] font-semibold"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-1 h-4 w-4" aria-hidden />
                    {verifFile ? 'Cambiar documento' : 'Adjuntar documento (opcional)'}
                  </Button>
                  {verifFile && (
                    <p className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-[12px] text-muted-foreground">
                      <FileImage className="h-4 w-4 shrink-0 text-blue" aria-hidden />
                      <span className="truncate">{verifFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setVerifFile(null)}
                        className="ml-auto shrink-0 font-semibold text-danger hover:underline"
                      >
                        Quitar
                      </button>
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={sendingVerif}
                  onClick={handleSendVerification}
                  className="h-11 w-full rounded-full text-[13.5px] font-bold text-navy"
                >
                  {sendingVerif ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ShieldCheck className="mr-1 h-4 w-4" aria-hidden />
                  )}
                  {sendingVerif ? 'Enviando solicitud…' : 'Enviar solicitud de verificación'}
                </Button>
              </>
            )}
          </div>
        </section>

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

// ─── Explicación adaptada al tipo elegido ───────────────────────────────────

function TipoInfoCard({
  tipo,
  zonaBase,
  cobertura,
}: {
  tipo: CoverageType
  zonaBase: string | null
  cobertura: string[]
}) {
  if (tipo === 'zone') {
    const multi = cobertura.length > 1
    const titular = multi
      ? 'Trabajas dentro de tu zona'
      : `Trabajas dentro de ${zonaBase ?? 'tu municipio base'}`
    return (
      <div className="space-y-2 rounded-2xl border border-cyan/25 bg-cyan/5 p-4" role="status">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
          {titular}
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Los clientes de tu zona te encontrarán en búsquedas locales. No publicas rutas
          interterritoriales: tu trabajo se concentra en tu municipio.
        </p>
        {cobertura.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {cobertura.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-navy"
              >
                <MapPin className="h-3 w-3 text-cyan" aria-hidden />
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (tipo === 'municipal') {
    return (
      <div className="space-y-2 rounded-2xl border border-blue/25 bg-blue/5 p-4" role="status">
        <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
          <RouteIcon className="h-4 w-4 shrink-0 text-blue" aria-hidden />
          Publicarás rutas de municipio a municipio
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Cada trayecto se define con origen y destino por municipios (p. ej. Camajuaní → Santa Clara).
          Podrás publicarlos desde «Mis rutas» cuando guardes la ficha.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl border border-orange/25 bg-orange/5 p-4" role="status">
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
        <Globe className="h-4 w-4 shrink-0 text-orange" aria-hidden />
        Publicarás rutas de provincia a provincia
      </p>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Cada trayecto se define con origen y destino por provincias (p. ej. Villa Clara → La Habana).
        Podrás publicarlos desde «Mis rutas» cuando guardes la ficha.
      </p>
    </div>
  )
}
