// MENRUT — PWA física: registro del Service Worker + aviso de instalación.
// · Registra /sw.js solo en producción (export estática servida por Pages).
// · Escucha beforeinstallprompt y muestra un banner discreto «Instalar app»
//   (descartable; no vuelve a molestar durante 7 días).
// · En iOS (Safari) muestra las instrucciones de «Añadir a pantalla de inicio».
'use client'

import { useEffect, useState } from 'react'
import { Download, Share, PlusSquare, X } from 'lucide-react'

const DISMISS_KEY = 'menrut-install-dismissed-until'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(true)
  const [isIos, setIsIos] = useState(false)
  const [showIosTip, setShowIosTip] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => null)
    }
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    setDismissed(Date.now() < until)
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent))

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Solo se muestra tras 12 s de uso (no interrumpe la primera impresión).
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 12_000)
    return () => clearTimeout(t)
  }, [])

  if (!ready || dismissed) return null

  // iOS: sin beforeinstallprompt → consejo manual una sola vez.
  if (isIos && !installEvent) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
        <div className="mx-auto mb-3 flex max-w-md items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-[0_10px_40px_rgba(7,29,67,0.25)]">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[13px] font-bold">Instala MENRUT en tu iPhone</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Toca <Share className="inline h-3.5 w-3.5" aria-hidden /> Compartir y luego{' '}
              <PlusSquare className="inline h-3.5 w-3.5" aria-hidden /> «Añadir a pantalla de inicio».
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400_000))
              setDismissed(true)
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  if (!installEvent) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
      <div className="mx-auto mb-3 flex max-w-md items-center gap-3 rounded-2xl border border-blue/30 bg-card px-4 py-3 shadow-[0_10px_40px_rgba(7,29,67,0.25)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
          <Download className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[13px] font-bold">Instala la app de MENRUT</p>
          <p className="truncate text-[11.5px] text-muted-foreground">Más rápida y funciona sin conexión</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-blue px-4 py-2 text-[12.5px] font-bold text-white active:scale-95"
          onClick={async () => {
            await installEvent.prompt()
            setInstallEvent(null)
            localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 86400_000))
          }}
        >
          Instalar
        </button>
        <button
          type="button"
          aria-label="Ahora no"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400_000))
            setDismissed(true)
          }}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
