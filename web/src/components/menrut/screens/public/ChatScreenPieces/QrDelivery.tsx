// MENRUT — ChatScreen · QR de entrega (mostrar y escanear con la cámara).
'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { Button } from '@/components/ui/button'

export function QrImage({ text }: { text: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(text, { margin: 1, width: 220, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null))
    return () => {
      alive = false
    }
  }, [text])
  if (!src) return <div className="mx-auto h-[220px] w-[220px] animate-pulse rounded-xl bg-secondary" aria-hidden />
  return <img src={src} alt="QR de la entrega" width={220} height={220} className="mx-auto rounded-xl bg-white p-2" />
}

export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const resultRef = useRef(onResult)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    resultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let finished = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin cámara')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const video = videoRef.current
        if (!video || finished) return stream.getTracks().forEach((t) => t.stop())
        video.srcObject = stream
        await video.play()
        const tick = () => {
          if (finished) return
          if (ctx && video.videoWidth > 0) {
            const w = Math.min(video.videoWidth, 640)
            const h = Math.round((video.videoHeight * w) / video.videoWidth)
            canvas.width = w
            canvas.height = h
            ctx.drawImage(video, 0, 0, w, h)
            const img = ctx.getImageData(0, 0, w, h)
            const found = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
            if (found?.data) {
              finished = true
              resultRef.current(found.data)
              return
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        setError('No se pudo usar la cámara. Revisa los permisos del navegador o escribe el código.')
      }
    }
    void start()
    return () => {
      finished = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="space-y-2 rounded-xl border border-line bg-background p-3">
      {error ? (
        <p className="text-[12px] text-destructive">{error}</p>
      ) : (
        <video ref={videoRef} muted playsInline className="mx-auto aspect-square w-full max-w-[260px] rounded-lg bg-black object-cover" />
      )}
      <p className="text-center text-[12px] text-muted-foreground">Apunta la cámara al QR de la entrega.</p>
      <Button type="button" variant="secondary" className="h-9 w-full rounded-full text-[13px]" onClick={onClose}>
        Cerrar cámara
      </Button>
    </div>
  )
}
