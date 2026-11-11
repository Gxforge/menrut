// MENRUT — Splash / Carga
// Muestra el logo ORIGINAL (PNG oficial convertido a WebP ligero, ~53 KB).
// Tras un máximo de ~1,7 s avanza SIEMPRE: sesión → su pantalla · visitante →
// INICIO con contenido (la búsqueda es pública; nadie ve un muro de registro).
// El avance no depende de la red: aunque la restauración de sesión tarde,
// la app entra y el contenido público se muestra de inmediato.
'use client'

import { useEffect } from 'react'
import { MenrutMark } from '@/components/menrut/core/Brand'
import { useAppStore } from '@/lib/store'

export default function SplashScreen() {
  const session = useAppStore((s) => s.session)
  const resetTo = useAppStore((s) => s.resetTo)

  useEffect(() => {
    // Enlace directo del staff: /?admin. Sin sesión, pasa por el inicio de sesión.
    // El permiso real lo comprueba el backend; esto solo decide a qué pantalla se entra.
    const wantsAdmin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('admin')
    const target = session
      ? session.role === 'courier'
        ? 'courier-home'
        : session.role === 'owner' || session.role === 'admin'
          ? 'admin-home'
          : session.role === 'moderator'
            ? 'admin-moderation'
            : 'home'
      : wantsAdmin ? 'login' : 'home'
    const t = setTimeout(() => {
      if (useAppStore.getState().screen === 'splash') {
        // El primer avance limpia el historial; luego la navegación es normal
        resetTo(target as never)
      }
    }, 1700)
    return () => clearTimeout(t)
  }, [session, resetTo])

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-deep px-6 text-center text-white">
      {/* Arcos de carretera — motivo de marca (CSS puro, sin imágenes) */}
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

      {/* Logo original en WebP ligero (el icono ya trae sus esquinas redondeadas) */}
      <div className="animate-in fade-in slide-in-from-bottom-3 relative z-10 flex flex-col items-center duration-700">
        <div className="drop-shadow-[0_18px_44px_rgba(3,15,40,0.65)]">
          <MenrutMark className="h-44 w-44 sm:h-48 sm:w-48" />
        </div>

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
