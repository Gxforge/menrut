// MENRUT — Aviso de actualización.
// Compara la compilación cargada con /version.json (sin caché). Si hay una nueva:
//  · muestra un cartel centrado «Actualizando MENRUT» UNA sola vez por versión
//    (las comprobaciones periódicas no lo vuelven a mostrar);
//  · si la actualización es obligatoria, recarga sola; si no, ofrece
//    «Actualizar ahora» o «Más tarde» (recordado durante la sesión).
// Tras recargar muestra una pantalla de verificación (versión y estado de la API)
// y solo entonces la oculta. No borra la caché del navegador.
'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { APP_BUILD } from '@/lib/app-version'

const POST_UPDATE_KEY = 'menrut:post-update'
const DISMISSED_KEY = 'menrut:update-dismissed'
const CHECK_EVERY_MS = 60_000
const RELOAD_AFTER_MS = 8_000

type Remote = { build: string; version?: string; mandatory?: boolean }
type Phase = 'idle' | 'updating' | 'verifying' | 'failed'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* sin sessionStorage no se puede recordar; no es grave */
  }
}

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
  const [target, setTarget] = useState<Remote | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownBuild = useRef<string | null>(null)

  // 1) Tras una recarga por actualización: verificar antes de ocultar la pantalla.
  useEffect(() => {
    const expected = readSession(POST_UPDATE_KEY)
    if (!expected) return
    setPhase('verifying')
    ;(async () => {
      const [remote, api] = await Promise.all([fetchRemote(), apiHealthy()])
      const ok = !!remote && remote.build === APP_BUILD && api
      if (ok) {
        writeSession(POST_UPDATE_KEY, null)
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
      // Ya mostrado o descartado para esta versión: no volver a mostrarlo.
      if (shownBuild.current === remote.build) return
      if (readSession(DISMISSED_KEY) === remote.build && !remote.mandatory) return
      shownBuild.current = remote.build
      setTarget(remote)
      setPhase((p) => (p === 'verifying' ? p : 'updating'))
      if (remote.mandatory) {
        if (timer.current) return
        timer.current = setTimeout(() => {
          writeSession(POST_UPDATE_KEY, remote.build)
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

  function postpone() {
    if (target) writeSession(DISMISSED_KEY, target.build)
    setPhase('idle')
  }

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

  if (phase !== 'updating' || !target) return null

  const mandatory = !!target.mandatory

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/60 px-5 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        aria-describedby="update-text"
        className="w-full max-w-[340px] rounded-3xl bg-white px-6 py-7 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue/10">
          <Loader2 className="h-7 w-7 animate-spin text-blue" aria-hidden />
        </div>
        <h2 id="update-title" className="text-[18px] font-extrabold text-navy">
          Actualizando MENRUT
        </h2>
        <p id="update-text" className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {mandatory
            ? 'Estamos instalando la versión nueva. La app se recargará sola en unos segundos. No cierres la aplicación.'
            : 'Hay una versión nueva disponible. Puedes actualizar ahora o más tarde.'}
        </p>
        {target.version ? (
          <p className="mt-3 text-[12px] text-muted-foreground">Versión {target.version}</p>
        ) : null}
        {mandatory ? null : (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-full bg-blue px-6 text-[14px] font-bold text-white"
            >
              Actualizar ahora
            </button>
            <button
              type="button"
              onClick={postpone}
              className="h-10 rounded-full px-6 text-[13px] font-semibold text-navy"
            >
              Más tarde
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
