// MENRUT — Marca original (PNG oficial convertido a WebP ligero)
// Se usa el logo ORIGINAL del proyecto, tal cual fue diseñado, solo convertido
// a WebP para que pese poco (~53 KB el icono, ~64 KB el horizontal) y cargue
// al instante incluso con conexiones lentas. No se recreó ni se rediseñó.
//   · menrut-mark.webp     → icono cuadrado original (esquinas redondeadas
//                            incorporadas en la propia obra; funciona sobre
//                            cualquier fondo)
//   · menrut-wordmark.webp → logotipo horizontal original (azul oscuro, para
//                            fondos claros; sobre fondos oscuros se presenta
//                            dentro de una pastilla blanca sin alterarlo)
'use client'

import { cn } from '@/lib/utils'

export function MenrutMark({
  className,
  title = 'MENRUT',
}: {
  className?: string
  title?: string
}) {
  return (
     
    <img
      src="/brand/menrut-mark.webp"
      alt={title}
      width={640}
      height={640}
      decoding="async"
      draggable={false}
      className={cn('block h-28 w-28 select-none', className)}
    />
  )
}

export function MenrutWordmark({
  className,
  tone = 'dark',
  title = 'MENRUT',
}: {
  className?: string
  /** 'dark' para fondos claros (logo tal cual) · 'light' para fondos oscuros (pastilla blanca) */
  tone?: 'dark' | 'light'
  title?: string
}) {
  if (tone === 'light') {
    // El logotipo original es azul oscuro: sobre fondos oscuros se conserva
    // intacto y se apoya en una pastilla blanca para que sea legible.
    return (
      <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 shadow-[0_6px_18px_rgba(3,15,40,0.35)]">
        { }
        <img
          src="/brand/menrut-wordmark.webp"
          alt={title}
          width={1600}
          height={533}
          decoding="async"
          draggable={false}
          className={cn('block h-6 w-auto select-none', className)}
        />
      </span>
    )
  }
  return (
     
    <img
      src="/brand/menrut-wordmark.webp"
      alt={title}
      width={1600}
      height={533}
      decoding="async"
      draggable={false}
      className={cn('block h-9 w-auto select-none', className)}
    />
  )
}
