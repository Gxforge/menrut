// MENRUT — Configuración del mensajero
// (Las secciones y diálogos viven en SettingsScreenPieces/.)
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getSupabase } from '@/lib/supabase'
import { signOutSupabase } from '@/lib/auth'
import { useAppStore } from '@/lib/store'
import { TopBar } from '@/components/menrut/core/TopBar'
import { AccountHeader } from './SettingsScreenPieces/AccountHeader'
import { VisibilityCard } from './SettingsScreenPieces/VisibilityCard'
import { AvisosSection } from './SettingsScreenPieces/AvisosSection'
import {
  AboutSection, HelpSection, PassportSection, SecuritySection,
} from './SettingsScreenPieces/MenuSections'
import {
  HelpDialog, LogoutDialog, PasswordDialog, TermsDialog,
} from './SettingsScreenPieces/SettingsDialogs'
import { AVISOS_INICIALES, AVISOS_KEY, type Avisos } from './SettingsScreenPieces/helpers'

export default function SettingsScreen() {
  const session = useAppStore((s) => s.session)
  const navigate = useAppStore((s) => s.navigate)
  const back = useAppStore((s) => s.back)
  const logout = useAppStore((s) => s.logout)

  // Visibilidad real (no hay interruptor: se gestiona con la permanencia)
  const dashQ = useQuery({
    queryKey: ['courier-dashboard'],
    queryFn: () => api.courierDashboard(),
    enabled: !!session,
  })

  // Preferencias de avisos (solo en este dispositivo)
  const [avisos, setAvisos] = useState<Avisos | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [ayudaOpen, setAyudaOpen] = useState(false)
  const [terminosOpen, setTerminosOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AVISOS_KEY)
      if (!raw) {
        setAvisos(AVISOS_INICIALES)
        return
      }
      const p = JSON.parse(raw) as Partial<Avisos>
      setAvisos({
        mensajes: typeof p.mensajes === 'boolean' ? p.mensajes : true,
        rutas: typeof p.rutas === 'boolean' ? p.rutas : true,
        valoraciones: typeof p.valoraciones === 'boolean' ? p.valoraciones : true,
      })
    } catch {
      setAvisos(AVISOS_INICIALES)
    }
  }, [])

  const toggleAviso = (k: keyof Avisos, v: boolean) => {
    const base = avisos ?? AVISOS_INICIALES
    const next = { ...base, [k]: v }
    setAvisos(next)
    try {
      localStorage.setItem(AVISOS_KEY, JSON.stringify(next))
    } catch {
      toast.error('No se pudo guardar la preferencia en este dispositivo.')
    }
  }

  // Cambio de contraseña real (Supabase Auth)
  const pwdQ = useMutation({
    mutationFn: async () => {
      if (pwd.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      if (pwd !== pwd2) throw new Error('Las contraseñas no coinciden.')
      const { error } = await getSupabase().auth.updateUser({ password: pwd })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada.')
      setPwdOpen(false)
      setPwd('')
      setPwd2('')
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo actualizar la contraseña.'),
  })

  const cerrarSesion = async () => {
    try {
      await signOutSupabase()
    } finally {
      setLogoutOpen(false)
      logout()
    }
  }

  const nombre = session?.fullName ?? 'Mensajero'
  const email = session?.email ?? ''
  const dash = dashQ.data

  return (
    <div>
      <TopBar title="Configuración" subtitle="Cuenta, avisos y seguridad" onBack={back} />

      <div className="px-4 pt-4 pb-8">
        {/* Cabecera de identidad */}
        <AccountHeader nombre={nombre} email={email} avatarUrl={session?.avatarUrl} />

        {/* 1 · Datos del pasaporte */}
        <PassportSection onPassport={() => navigate('complete-profile')} />

        {/* 2 · Visibilidad y disponibilidad */}
        <VisibilityCard
          isLoading={dashQ.isLoading}
          isError={dashQ.isError}
          dash={dash}
          onRetry={() => void dashQ.refetch()}
          onMembership={() => navigate('membership')}
        />

        {/* 3 · Avisos (preferencias locales) */}
        <AvisosSection avisos={avisos} onToggle={toggleAviso} />

        {/* 4 · Seguridad */}
        <SecuritySection
          onPwdOpen={() => setPwdOpen(true)}
          onLogoutOpen={() => setLogoutOpen(true)}
          onDeliveries={() => navigate('courier-deliveries')}
        />

        {/* 5 · Ayuda */}
        <HelpSection onAyudaOpen={() => setAyudaOpen(true)} />

        {/* 6 · Acerca de */}
        <AboutSection onTerminosOpen={() => setTerminosOpen(true)} onPrivacidad={() => navigate('privacy')} />

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </div>

      {/* Cambiar contraseña */}
      <PasswordDialog
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        pwd={pwd}
        pwd2={pwd2}
        onPwdChange={setPwd}
        onPwd2Change={setPwd2}
        isPending={pwdQ.isPending}
        onSubmit={() => pwdQ.mutate()}
      />

      {/* Confirmar cierre de sesión */}
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={() => void cerrarSesion()} />

      {/* Soporte */}
      <HelpDialog open={ayudaOpen} onOpenChange={setAyudaOpen} />

      {/* Términos */}
      <TermsDialog open={terminosOpen} onOpenChange={setTerminosOpen} />

      {/* Privacidad */}
    </div>
  )
}
