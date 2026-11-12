// MENRUT — Aviso de actualización.
// Compara la compilación cargada con /version.json (sin caché). Si hay una nueva:
//  · muestra «Actualización en proceso» (se puede cerrar, pero la app se recargará);
//  · si la actualización es obligatoria, recarga sola; si no, ofrece «Actualizar ahora».
// Tras recargar muestra una pantalla de verificación (versión y estado de la API)
// y solo entonces la oculta. No borra la caché del navegador.
'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { APP_BUILD } from '@/lib/app-version'

const POST_UPDATE_KEY = 'menrut:post-update'
const CHECK_EVERY_MS = 60_000
const RELOAD_AFTER_MS = 8_000

type Remote = { build: string; mandatory?: boolean }
type Phase = 'idle' | 'updating' | 'verifying' | 'failed'

async function fetchRemote(): Promise<Remote | null> {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as Remote
    return typeof data.build === 'string' ? data : null
  } catch {
    return null
  }
}

async function apiHealthy(): Promise<boolean> {
  try {
    const res = await fetch('/api/v2/plans', { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

export function UpdateGate() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [hidden, setHidden] = useState(false)
  const [target, setTarget] = useState<Remote | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 1) Tras una recarga por actualización: verificar antes de ocultar la pantalla.
  useEffect(() => {
    let expected: string | null = null
    try {
      expected = sessionStorage.getItem(POST_UPDATE_KEY)
    } catch {
      expected = null
    }
    if (!expected) return
    setPhase('verifying')
    ;(async () => {
      const [remote, api] = await Promise.all([fetchRemote(), apiHealthy()])
      const ok = !!remote && remote.build === APP_BUILD && api
      if (ok) {
        try {
          sessionStorage.removeItem(POST_UPDATE_KEY)
        } catch {
          /* sin sessionStorage no hay nada que limpiar */
        }
        setPhase('idle')
      } else {
        setPhase('failed')
      }
    })()
  }, [])

  // 2) Comprobación periódica y al volver a la app.
  useEffect(() => {
    if (APP_BUILD === 'dev') return
    let cancelled = false

    async function check() {
      const remote = await fetchRemote()
      if (cancelled || !remote || remote.build === APP_BUILD) return
      setTarget(remote)
      setPhase((p) => (p === 'verifying' ? p : 'updating'))
      setHidden(false)
      if (remote.mandatory) {
        if (timer.current) return
        timer.current = setTimeout(() => {
          try {
            sessionStorage.setItem(POST_UPDATE_KEY, remote.build)
          } catch {
            /* sin sessionStorage la recarga sigue, sin verificación posterior */
          }
          window.location.reload()
        }, RELOAD_AFTER_MS)
      }
    }

    const id = setInterval(check, CHECK_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    check()
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (phase === 'verifying') {
    return (
      <div role="status" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue" aria-hidden />
        <p className="text-[15px] font-semibold">Verificando la actualización…</p>
        <p className="text-[12.5px] text-muted-foreground">Comprobamos la versión y el estado de la app.</p>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div role="alert" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-[15px] font-semibold">No pudimos verificar la actualización</p>
        <p className="text-[12.5px] text-muted-foreground">Revisa tu conexión y vuelve a intentarlo.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 h-11 rounded-full bg-blue px-6 text-[14px] font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (phase !== 'updating' || hidden) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[90] flex items-center gap-3 bg-navy px-4 py-3 text-[13px] text-white shadow-lg"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      <p className="flex-1 leading-snug">
        <strong>Actualización en proceso.</strong>{' '}
        {target?.mandatory
          ? 'La app se recargará al terminar.'
          : 'Hay una versión nueva. Pulsa «Actualizar» cuando quieras.'}
      </p>
      {target?.mandatory ? null : (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-navy"
        >
          Actualizar
        </button>
      )}
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Cerrar aviso"
        className="px-1 text-[18px] leading-none opacity-80"
      >
        ×
      </button>
    </div>
  )
}
