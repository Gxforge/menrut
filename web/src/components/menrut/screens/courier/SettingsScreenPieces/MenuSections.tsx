// MENRUT — SettingsScreen · Secciones de navegación: pasaporte, seguridad,
// ayuda y acerca de (filas que abren pantallas o diálogos).
'use client'

import {
  ChevronRight, IdCard, LifeBuoy, FileText, Info, Lock, LogOut, ShieldCheck,
} from 'lucide-react'

// 1 · Datos del pasaporte
export function PassportSection({ onPassport }: { onPassport: () => void }) {
  return (
    <section className="mt-5" aria-label="Datos del pasaporte">
      <h2 className="section-title mb-2.5">Datos del pasaporte</h2>
      <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={onPassport}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <IdCard className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight">Editar pasaporte</span>
            <span className="block text-[11.5px] text-muted-foreground">
              Presentación, experiencia y verificación
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </nav>
    </section>
  )
}

// 4 · Seguridad
export function SecuritySection({ onPwdOpen, onLogoutOpen }: { onPwdOpen: () => void; onLogoutOpen: () => void }) {
  return (
    <section className="mt-5" aria-label="Seguridad">
      <h2 className="section-title mb-2.5">Seguridad</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={onPwdOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <Lock className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight">Cambiar contraseña</span>
            <span className="block text-[11.5px] text-muted-foreground">Actualiza tu clave de acceso</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onLogoutOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight text-destructive">
              Cerrar sesión
            </span>
            <span className="block text-[11.5px] text-muted-foreground">Salir de tu cuenta en este dispositivo</span>
          </span>
        </button>
      </div>
    </section>
  )
}

// 5 · Ayuda
export function HelpSection({ onAyudaOpen }: { onAyudaOpen: () => void }) {
  return (
    <section className="mt-5" aria-label="Ayuda">
      <h2 className="section-title mb-2.5">Ayuda</h2>
      <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <button
          type="button"
          onClick={onAyudaOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <LifeBuoy className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight">Soporte</span>
            <span className="block text-[11.5px] text-muted-foreground">Dudas frecuentes de mensajeros</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </nav>
    </section>
  )
}

// 6 · Acerca de
export function AboutSection({ onTerminosOpen, onPrivacidadOpen }: { onTerminosOpen: () => void; onPrivacidadOpen: () => void }) {
  return (
    <section className="mt-5" aria-label="Acerca de">
      <h2 className="section-title mb-2.5">Acerca de</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <Info className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold leading-tight">MENRUT</p>
            <p className="text-[11.5px] text-muted-foreground">Conectamos caminos. · Versión 1.0.0-dev</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onTerminosOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <FileText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight">Términos y condiciones</span>
            <span className="block text-[11.5px] text-muted-foreground">Resumen de las reglas de uso</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onPrivacidadOpen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight">Política de privacidad</span>
            <span className="block text-[11.5px] text-muted-foreground">Qué datos usamos y para qué</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </div>
    </section>
  )
}
