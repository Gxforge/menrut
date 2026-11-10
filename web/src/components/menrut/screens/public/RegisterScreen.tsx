// MENRUT — Registro de cuentas (3 tipos)
// El cliente elige QUÉ cuenta crea:
//   · Mensajero — publica rutas y su pasaporte profesional
//   · Usuario   — guarda favoritos, opina y puntúa mensajeros, chatea
//   · Negocio   — contacta mensajeros para entregas y encargos comerciales
// La búsqueda es pública: quien solo busca no necesita cuenta (estilo YerroMenu).
// Flujo real: Supabase signUp (con rol en metadatos) → sync con backend →
// destino según rol.
'use client'

import { useState } from 'react'
import { ArrowLeft, Compass } from 'lucide-react'
import { toast } from 'sonner'
import { MenrutMark } from '@/components/menrut/core/Brand'
import { signUpWithEmail } from '@/lib/auth'
import { completeLogin } from '@/components/menrut/hooks'
import { useAppStore } from '@/lib/store'
import { AccountFormFields } from '@/components/menrut/screens/public/RegisterPieces/AccountFormFields'
import { RolePicker } from '@/components/menrut/screens/public/RegisterPieces/RolePicker'
import { TermsDialog } from '@/components/menrut/screens/public/RegisterPieces/TermsDialog'
import {
  EMAIL_RE, ROLE_OPTIONS, SignupRole,
} from '@/components/menrut/screens/public/RegisterPieces/roleOptions'

export default function RegisterScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const resetTo = useAppStore((s) => s.resetTo)

  const [role, setRole] = useState<SignupRole | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const chosen = ROLE_OPTIONS.find((r) => r.value === role) ?? null

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!role) next.role = 'Elige qué tipo de cuenta necesitas.'
    if (fullName.trim().length < 3) next.fullName = 'Escribe tu nombre y apellidos.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Escribe un correo válido.'
    if (password.length < 6) next.password = 'Usa al menos 6 caracteres.'
    if (confirm !== password) next.confirm = 'Las contraseñas no coinciden.'
    if (!accepted) next.accepted = 'Debes aceptar los términos para continuar.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!validate()) return
    setLoading(true)
    try {
      await signUpWithEmail(email.trim(), password, fullName.trim(), role ?? 'client')
      try {
        const user = await completeLogin(role ?? 'client')
        if (user.role === 'owner' || user.role === 'admin') {
          toast.success('Cuenta reconocida como Propietario. Entrando al panel.')
          resetTo('admin-home')
        } else if (user.role === 'moderator') {
          toast.success('Cuenta reconocida como Moderador.')
          resetTo('admin-moderation')
        } else if (user.role === 'business') {
          toast.success('Cuenta de negocio creada. Bienvenido a MENRUT.')
          resetTo('home')
        } else if (user.role === 'courier') {
          toast.success('Cuenta creada. Completa tu perfil profesional.')
          navigate('complete-profile')
        } else {
          toast.success('Cuenta creada. Ya puedes guardar favoritos y opinar.')
          resetTo('home')
        }
      } catch (syncErr) {
        const msg = syncErr instanceof Error ? syncErr.message : ''
        if (msg.includes('No hay sesión activa')) {
          // Supabase pidió confirmación por correo: la cuenta existe pero aún no entra.
          toast.info('Revisa tu correo y confirma la cuenta para empezar a usar MENRUT.')
          navigate('login')
        } else {
          toast.error('No pudimos terminar de crear tu perfil. Intenta entrar en unos minutos.')
          navigate('login')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        toast.error('Este correo ya tiene cuenta. Inicia sesión.')
      } else if (msg.includes('password') && (msg.includes('weak') || msg.includes('at least') || msg.includes('characters'))) {
        toast.error('La contraseña es demasiado débil. Usa al menos 6 caracteres con letras y números.')
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        toast.error('Demasiados intentos. Espera un momento y vuelve a probar.')
      } else {
        toast.error('No se pudo crear la cuenta. Revisa tu conexión e inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-secondary/40 px-4 pb-8 pt-safe">
      <div className="flex items-center gap-2 px-1 pt-4">
        <button
          type="button"
          onClick={() => navigate('home')}
          aria-label="Volver al inicio"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-[12.5px] text-muted-foreground">Crear cuenta</p>
      </div>

      <section className="flex flex-1 flex-col py-4" aria-label="Crear cuenta en MENRUT">
        <div className="flex flex-col items-center text-center">
          <MenrutMark className="h-14 w-14" />
          <h1 className="screen-title mt-3">Crear cuenta</h1>
          <p className="mt-1 max-w-[320px] text-[13px] text-muted-foreground">
            Elige qué tipo de cuenta necesitas y empieza a usar MENRUT.
          </p>
        </div>

        {/* Quien solo busca no necesita cuenta: la búsqueda es pública */}
        <div
          className="mt-4 rounded-2xl border border-line bg-card p-4 text-center"
          role="note"
          aria-label="Buscar sin cuenta"
        >
          <p className="text-[12.5px] font-medium leading-relaxed text-foreground/85">
            ¿Solo buscas mensajeros? No necesitas cuenta.
          </p>
          <button
            type="button"
            onClick={() => resetTo('home')}
            className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-blue underline-offset-4 transition-transform hover:underline active:scale-95"
          >
            <Compass className="h-4 w-4" aria-hidden />
            Explorar sin registrarme
          </button>
        </div>

        {/* Selector de tipo de cuenta */}
        <RolePicker role={role} onRole={setRole} error={errors.role} />

        <div className="mt-4 rounded-3xl border border-line bg-card p-5 shadow-[0_18px_50px_rgba(20,67,130,0.08)]">
          {/* Resumen del rol elegido */}
          <div
            className="mb-4 flex items-center gap-2.5 rounded-2xl bg-orange/10 px-3.5 py-3"
            aria-live="polite"
          >
            {chosen ? (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange/15 text-orange">
                  <chosen.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[13.5px] font-bold leading-tight">Cuenta de {chosen.label.toLowerCase()}</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{chosen.perks}</p>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange/15 text-orange">
                  <Compass className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[13.5px] font-bold leading-tight">Selecciona un tipo de cuenta</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">
                    Mensajero, usuario o negocio — puedes cambiarlo luego con el equipo.
                  </p>
                </div>
              </>
            )}
          </div>

          <AccountFormFields
            fullName={fullName}
            onFullName={setFullName}
            email={email}
            onEmail={setEmail}
            password={password}
            onPassword={setPassword}
            confirm={confirm}
            onConfirm={setConfirm}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword((v) => !v)}
            accepted={accepted}
            onAccepted={setAccepted}
            errors={errors}
            onOpenTerms={() => setTermsOpen(true)}
            loading={loading}
            submitLabel={
              loading
                ? 'Creando cuenta…'
                : chosen
                  ? `Crear cuenta de ${chosen.label.toLowerCase()}`
                  : 'Crear cuenta'
            }
            onSubmit={handleSubmit}
          />
        </div>

        <p className="mt-5 text-center text-[13px] text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => navigate('login')}
            className="font-semibold text-blue underline-offset-4 hover:underline active:scale-95"
          >
            Inicia sesión
          </button>
        </p>
      </section>

      {/* Términos y privacidad */}
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  )
}
