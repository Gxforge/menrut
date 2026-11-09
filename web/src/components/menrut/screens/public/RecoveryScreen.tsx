// MENRUT — Recuperación de cuenta
// Solicita el enlace de recuperación y responde siempre con un mensaje
// neutro para no revelar si el correo existe en la plataforma.
'use client'

import { useState } from 'react'
import { KeyRound, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sendRecoveryEmail } from '@/lib/auth'
import { useAppStore } from '@/lib/store'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RecoveryScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const canBack = useAppStore((s) => s.history.length > 0)

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function handleBack() {
    if (canBack) back()
    else navigate('login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Escribe un correo válido.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await sendRecoveryEmail(email.trim())
      setSent(true)
    } catch {
      // También neutro ante errores: no filtramos si la cuenta existe.
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-secondary/40 px-4 pb-8 pt-safe">
      <div className="px-1 pt-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_50px_rgba(20,67,130,0.10)]">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue/10 text-blue">
              <KeyRound className="h-8 w-8" aria-hidden />
            </span>
            <h1 className="screen-title mt-4">Recuperar acceso</h1>
            <p className="mt-1 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {sent ? (
            <div className="mt-6 space-y-4" role="status">
              <div className="rounded-2xl bg-success/10 px-4 py-4 text-center">
                <p className="text-[13.5px] font-medium leading-relaxed text-foreground">
                  Si el correo está registrado, recibirás un enlace para recuperar tu cuenta.
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  Revisa tu bandeja de entrada y la carpeta de correo no deseado.
                </p>
              </div>
              <Button
                className="h-12 w-full rounded-full text-[15px] font-bold"
                onClick={() => navigate('login')}
              >
                Volver a iniciar sesión
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="recovery-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
                {error && <p className="text-xs text-danger">{error}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-full text-[15px] font-bold"
              >
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />}
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </Button>
              <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
                Por seguridad, la respuesta no indica si la cuenta existe.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
