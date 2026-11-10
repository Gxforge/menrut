// MENRUT — Piezas de RegisterScreen: campos del formulario de creación de
// cuenta (nombre, correo, contraseña, confirmación y aceptación de términos).
'use client'

import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AccountFormFields({
  fullName,
  onFullName,
  email,
  onEmail,
  password,
  onPassword,
  confirm,
  onConfirm,
  showPassword,
  onToggleShowPassword,
  accepted,
  onAccepted,
  errors,
  onOpenTerms,
  loading,
  submitLabel,
  onSubmit,
}: {
  fullName: string
  onFullName: (v: string) => void
  email: string
  onEmail: (v: string) => void
  password: string
  onPassword: (v: string) => void
  confirm: string
  onConfirm: (v: string) => void
  showPassword: boolean
  onToggleShowPassword: () => void
  accepted: boolean
  onAccepted: (v: boolean) => void
  errors: Record<string, string>
  onOpenTerms: () => void
  loading: boolean
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
            onChange={(e) => onFullName(e.target.value)}
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
            onChange={(e) => onEmail(e.target.value)}
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
            onChange={(e) => onPassword(e.target.value)}
            aria-invalid={!!errors.password}
            className="h-12 rounded-xl pl-10 pr-11"
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
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
            onChange={(e) => onConfirm(e.target.value)}
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
            onCheckedChange={(v) => onAccepted(v === true)}
            className="mt-0.5"
            aria-invalid={!!errors.accepted}
          />
          <Label htmlFor="reg-terms" className="text-[12.5px] font-normal leading-relaxed text-muted-foreground">
            Acepto los{' '}
            <button
              type="button"
              onClick={onOpenTerms}
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
        {submitLabel}
      </Button>
    </form>
  )
}
