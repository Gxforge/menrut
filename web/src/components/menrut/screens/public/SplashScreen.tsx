// MENRUT — Splash / Carga
// Fondo azul nocturno con arcos de carretera (cian y naranja), icono y logo
// reales, lema «Conectamos caminos.», carga corta y no bloqueante.
'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export default function SplashScreen() {
  const session = useAppStore((s) => s.session)
  const resetTo = useAppStore((s) => s.resetTo)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    const target = session
      ? session.role === 'courier'
        ? 'courier-home'
        : session.role === 'owner' || session.role === 'admin'
          ? 'admin-home'
          : session.role === 'moderator'
            ? 'admin-moderation'
            : 'home'
      : 'welcome'
    const t = setTimeout(() => {
      if (useAppStore.getState().screen === 'splash') {
        // El primer avance limpia el historial; luego la navegación es normal
        if (!session) resetTo('welcome')
        else resetTo(target as never)
      }
    }, 1700)
    return () => clearTimeout(t)
  }, [session, resetTo, navigate])

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-deep px-6 text-center text-white">
      {/* Arcos de carretera — motivo de marca (CSS ligero, sin imágenes pesadas) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-16 h-56 w-[560px] rounded-[50%] border-[22px] border-cyan/80 border-r-transparent border-b-transparent rotate-[-17deg] blur-[0.4px] drop-shadow-[0_0_16px_rgba(19,182,255,0.45)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-36 bottom-2 h-44 w-[560px] rounded-[50%] border-[18px] border-orange/90 border-r-transparent border-b-transparent rotate-[-14deg]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_20%,rgba(26,105,201,0.55)_0%,rgba(11,62,139,0.35)_33%,rgba(7,29,67,0)_78%)]"
      />

      <div className="relative z-10 flex flex-col items-center">
        <img
          src="/menrut/icons/icon-web.png"
          alt="Icono de MENRUT"
          width={112}
          height={112}
          loading="eager"
          className="rounded-[26px] shadow-[0_14px_40px_rgba(0,22,62,0.55)]"
        />
        <img
          src="/menrut/icons/logo-web.png"
          alt="MENRUT"
          width={210}
          height={70}
          loading="eager"
          className="mt-4 drop-shadow-[0_8px_18px_rgba(0,27,77,0.6)]"
        />
        <p className="mt-1 text-[13px] font-medium text-[#d9ecff]">
          Conectamos caminos.
        </p>

        <div
          aria-label="Cargando"
          className="mt-10 h-1 w-32 overflow-hidden rounded-full bg-white/25"
        >
          <div className="loading-bar h-full w-[45%] rounded-full bg-white" />
        </div>
        <p className="mt-3 text-[10.5px] tracking-wide text-[#9fc3e8]">
          Encuentra tu próxima conexión
        </p>
      </div>
    </div>
  )
}
