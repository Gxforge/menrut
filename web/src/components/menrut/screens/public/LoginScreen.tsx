// MENRUT — Inicio de sesión (Supabase real)
// Tarjeta blanca sobre fondo suave; validación local, estados de carga y
// redirección según el rol que devuelve completeLogin().
'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MenrutMark } from '@/components/menrut/core/Brand'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { signInWithEmail, signOutSupabase, readPendingRole } from '@/lib/auth'
import { completeLogin } from '@/components/menrut/hooks'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'
import { isAdminEntry } from '@/lib/admin-entry'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function homeFor(user: SessionUser): 'home' | 'courier-home' | 'admin-home' | 'admin-moderation' {
  if (user.role === 'courier') return 'courier-home'
  if (user.role === 'owner' || user.role === 'admin') return 'admin-home'
  if (user.role === 'moderator') return 'admin-moderation'
  return 'home'
}

export default function LoginScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const resetTo = useAppStore((s) => s.resetTo)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: { email?: string; password?: string } = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Escribe un correo válido.'
    if (password.length < 6) next.password = 'La contraseña debe tener al menos 6 caracteres.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!validate()) return
    setLoading(true)
    try {
      await signInWithEmail(email.trim(), password)
      try {
        // Primer login tras confirmar el correo: reaplica el rol elegido al
        // registrarse (la API v2 de producción no lee metadatos de Supabase).
        // completeLogin lo limpia solo si el sync tiene éxito.
        const user = await completeLogin(readPendingRole() ?? undefined)
        toast.success(`Hola de nuevo, ${user.fullName.split(' ')[0]}.`)
        resetTo(homeFor(user))
      } catch {
        // Login en Supabase correcto pero backend operativo caído: no dejar
        // una sesión a medias colgada.
        await signOutSupabase()
        toast.error('No pudimos completar el acceso. Comprueba tu conexión e inténtalo de nuevo.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        toast.error('Correo o contraseña incorrectos.')
      } else if (msg.includes('email not confirmed')) {
        toast.error('Confirma tu correo electrónico antes de entrar.')
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        toast.error('Demasiados intentos. Espera un momento y vuelve a probar.')
      } else {
        toast.error('No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-secondary/40 px-4 pb-8 pt-safe">
      <div className="px-1 pt-4">
        <button
          type="button"
          onClick={() => navigate('home')}
          aria-label="Volver al inicio"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_50px_rgba(20,67,130,0.10)]">
          <div className="flex flex-col items-center text-center">
            <MenrutMark className="h-16 w-16 rounded-2xl shadow-[0_10px_24px_rgba(11,43,96,0.18)]" />
            <h1 className="screen-title mt-4">Inicia sesión</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Vuelve a conectar con tus rutas.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="login-email"
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
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
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

            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('recovery')}
                className="rounded text-[12.5px] font-semibold text-blue underline-offset-4 hover:underline active:scale-95"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full text-[15px] font-bold"
            >
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {!isAdminEntry() ? (
          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('register')}
              className="font-semibold text-blue underline-offset-4 hover:underline active:scale-95"
            >
              Regístrate
            </button>
          </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
