// MENRUT — Registro / Selección de tipo de cuenta
// Paso 1: tipo de cuenta. Quien busca mensajeros NO necesita cuenta (la
// búsqueda es pública): el registro es solo para mensajeros y negocios.
// Paso 2: datos y consentimiento. Flujo real: Supabase signUp → sync con
// backend → destino según rol.
'use client'

import { useState } from 'react'
import { Bike, Store, ArrowLeft, Loader2, Eye, EyeOff, Lock, Mail, User, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { signUpWithEmail } from '@/lib/auth'
import { completeLogin } from '@/components/menrut/hooks'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// El registro está abierto solo para quien ofrece (mensajero o negocio)
type AccountKind = 'courier' | 'business'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const resetTo = useAppStore((s) => s.resetTo)

  const [step, setStep] = useState<1 | 2>(1)
  const [kind, setKind] = useState<AccountKind | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function choose(k: AccountKind) {
    setKind(k)
    setErrors({})
    setStep(2)
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {}
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
    if (loading || !kind) return
    if (!validateStep2()) return
    setLoading(true)
    try {
      await signUpWithEmail(email.trim(), password, fullName.trim())
      try {
        await completeLogin(kind)
        if (kind === 'courier') {
          toast.success('Cuenta creada. Completa tu perfil profesional.')
          navigate('complete-profile')
        } else {
          toast.success('Cuenta creada. Bienvenido a MENRUT.')
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
          onClick={() => (step === 2 ? setStep(1) : navigate('welcome'))}
          aria-label="Volver"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        {step === 2 && (
          <p className="text-[12.5px] text-muted-foreground">
            {kind === 'courier' ? 'Cuenta de mensajero' : 'Cuenta de negocio'}
          </p>
        )}
      </div>

      {step === 1 ? (
        <section className="flex flex-1 flex-col justify-center py-6" aria-label="Tipo de cuenta">
          <div className="flex flex-col items-center text-center">
            <img
              src="/menrut/icons/icon-web.png"
              alt="Icono de MENRUT"
              width={56}
              height={56}
              loading="eager"
              className="rounded-2xl shadow-[0_10px_24px_rgba(11,43,96,0.16)]"
            />
            <h1 className="screen-title mt-4">Crear cuenta</h1>
            <p className="mt-1 max-w-[300px] text-[13px] text-muted-foreground">
              Únete a MENRUT y conecta caminos en toda Cuba.
            </p>
          </div>

          {/* Quien busca no necesita cuenta: la búsqueda es pública */}
          <div
            className="mt-6 rounded-2xl border border-line bg-card p-4 text-center"
            role="note"
            aria-label="Buscar sin cuenta"
          >
            <p className="text-[12.5px] font-medium leading-relaxed text-foreground/85">
              Para buscar mensajeros no necesitas cuenta.
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

          <div className="mt-4 space-y-3">
            <AccountCard
              icon={<Bike className="h-7 w-7" aria-hidden />}
              title="Mensajero"
              description="Ofrezco mi ruta y servicios"
              onClick={() => choose('courier')}
              tone="orange"
            />
            <AccountCard
              icon={<Store className="h-7 w-7" aria-hidden />}
              title="Negocio"
              description="Necesito entregas comerciales"
              onClick={() => choose('business')}
            />
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
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
      ) : (
        <section className="flex-1 py-4" aria-label="Datos de la cuenta">
          <div className="rounded-3xl border border-line bg-card p-5 shadow-[0_18px_50px_rgba(20,67,130,0.08)]">
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Nombre completo</Label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="reg-name"
                    autoComplete="name"
                    placeholder="Tu nombre y apellidos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-invalid={!!errors.fullName}
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
                {errors.fullName && <p className="text-xs text-danger">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="reg-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
                {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Contraseña</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    className="h-12 rounded-xl pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-90"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    aria-invalid={!!errors.confirm}
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
                {errors.confirm && <p className="text-xs text-danger">{errors.confirm}</p>}
              </div>

              <div>
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="reg-terms"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(v === true)}
                    className="mt-0.5"
                    aria-invalid={!!errors.accepted}
                  />
                  <Label htmlFor="reg-terms" className="text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="font-semibold text-blue underline-offset-2 hover:underline"
                    >
                      Términos y la Política de privacidad
                    </button>
                    .
                  </Label>
                </div>
                {errors.accepted && <p className="mt-1 text-xs text-danger">{errors.accepted}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-full text-[15px] font-bold"
              >
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
                {loading
                  ? 'Creando cuenta…'
                  : kind === 'courier'
                    ? 'Crear cuenta de mensajero'
                    : 'Crear cuenta de negocio'}
              </Button>
            </form>
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
      )}

      {/* Términos y privacidad */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[80dvh] max-w-[380px] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Términos y Política de privacidad</DialogTitle>
            <DialogDescription className="sr-only">Resumen de las condiciones de uso de MENRUT</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Qué es MENRUT.</strong> MENRUT es una plataforma que
              conecta mensajeros, clientes y negocios en Cuba. No presta el servicio de mensajería ni
              transporta paquetes: facilita el encuentro y la comunicación entre las partes.
            </p>
            <p>
              <strong className="text-foreground">Tus datos.</strong> Solo pedimos la información
              necesaria para que la plataforma funcione: nombre, correo y los datos profesionales que
              decidas publicar. Los documentos de verificación se guardan de forma privada y nunca se
              muestran en tu pasaporte público.
            </p>
            <p>
              <strong className="text-foreground">Verificaciones.</strong> El sello «Identidad
              verificada» solo aparece cuando el equipo de MENRUT comprueba la identidad del mensajero.
              El resto de la información del perfil es declarada por su titular.
            </p>
            <p>
              <strong className="text-foreground">Uso responsable.</strong> Los acuerdos de servicio,
              tarifas y condiciones de entrega se pactan directamente entre cliente y mensajero. Trata
              con respeto a las personas y usa el botón de reporte si algo no va bien.
            </p>
            <p>
              Puedes cerrar tu cuenta en cualquier momento desde tu perfil. Al continuar, confirmas que
              entiendes y aceptas estas condiciones.
            </p>
          </div>
          <Button className="h-11 w-full rounded-full font-bold" onClick={() => setTermsOpen(false)}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountCard({
  icon, title, description, onClick, tone = 'blue',
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  tone?: 'blue' | 'orange'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-5 text-left shadow-[0_10px_28px_rgba(20,67,130,0.07)] transition-all hover:border-blue/50 hover:shadow-[0_14px_36px_rgba(20,67,130,0.13)] active:scale-[0.98]',
        tone === 'orange' && 'hover:border-orange/50'
      )}
    >
      <span
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
          tone === 'orange' ? 'bg-orange/10 text-orange' : 'bg-blue/10 text-blue'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[17px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
