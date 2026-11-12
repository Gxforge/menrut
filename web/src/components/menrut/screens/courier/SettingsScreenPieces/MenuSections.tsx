// MENRUT — SettingsScreen · Secciones de navegación: pasaporte, seguridad,
// ayuda y acerca de (filas que abren pantallas o diálogos).
'use client'

import { APP_VERSION_LABEL } from '@/lib/app-version'
import {
  ChevronRight, IdCard, LifeBuoy, FileText, Info, Lock, LogOut, ShieldCheck, PackageCheck,
  ExternalLink, Sparkles,
} from 'lucide-react'

// Fila reutilizable (icono + título + subtítulo + chevron).
function Row({
  icon, iconClass, title, subtitle, onClick, danger,
}: {
  icon: React.ReactNode
  iconClass: string
  title: string
  subtitle: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] font-semibold leading-tight ${danger ? 'text-destructive' : ''}`}>
          {title}
        </span>
        <span className="block text-[11.5px] text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

// 1 · Datos del pasaporte
export function PassportSection({ onPassport }: { onPassport: () => void }) {
  return (
    <section className="mt-5" aria-label="Datos del pasaporte">
      <h2 className="section-title mb-2.5">Datos del pasaporte</h2>
      <nav className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <Row
          icon={<IdCard className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Editar pasaporte"
          subtitle="Presentación, experiencia y verificación"
          onClick={onPassport}
        />
      </nav>
    </section>
  )
}

// 4 · Seguridad y actividad
export function SecuritySection({
  onPwdOpen, onLogoutOpen, onDeliveries,
}: {
  onPwdOpen: () => void
  onLogoutOpen: () => void
  onDeliveries: () => void
}) {
  return (
    <section className="mt-5" aria-label="Seguridad">
      <h2 className="section-title mb-2.5">Seguridad y actividad</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        <Row
          icon={<PackageCheck className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Entregas verificadas"
          subtitle="Verifica con el código OTP de tu cliente"
          onClick={onDeliveries}
        />
        <Row
          icon={<Lock className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Cambiar contraseña"
          subtitle="Actualiza tu clave de acceso"
          onClick={onPwdOpen}
        />
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
        <Row
          icon={<LifeBuoy className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Soporte"
          subtitle="Dudas frecuentes de mensajeros"
          onClick={onAyudaOpen}
        />
      </nav>
    </section>
  )
}

// 6 · Acerca de
export function AboutSection({ onTerminosOpen, onPrivacidad }: { onTerminosOpen: () => void; onPrivacidad: () => void }) {
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
            <p className="text-[11.5px] text-muted-foreground">Conectamos caminos. · {APP_VERSION_LABEL}</p>
          </div>
        </div>
        <Row
          icon={<FileText className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Términos y condiciones"
          subtitle="Resumen de las reglas de uso"
          onClick={onTerminosOpen}
        />
        <Row
          icon={<ShieldCheck className="h-[18px] w-[18px]" aria-hidden />}
          iconClass="bg-blue/10 text-blue"
          title="Privacidad y datos"
          subtitle="Qué datos usamos, derechos y borrado de cuenta"
          onClick={onPrivacidad}
        />
      </div>
      <CreditCard />
    </section>
  )
}

// Crédito del estudio que desarrolla la app. Abre su sitio en una pestaña nueva.
function CreditCard() {
  return (
    <a
      href="https://studiolexair.ddns.net"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Creado por Studio Lexair, desarrollo digital. Abre el sitio del estudio en una pestaña nueva."
      className="mt-3 flex items-center gap-3 rounded-2xl border border-blue/30 bg-deep px-4 py-3.5 text-white no-underline"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan">
        <Sparkles className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-cyan">Creado por Studio Lexair · Desarrollo digital</span>
        <span className="block text-[13px] font-semibold leading-snug">MenRut es un proyecto de Studio Lexair</span>
        <span className="block text-[11.5px] text-white/70">Sitios web, catálogos digitales y aplicaciones a medida</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
    </a>
  )
}
