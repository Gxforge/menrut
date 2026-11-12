'use client'

// MENRUT — aplicación (en /app/). La portada pública está en /.
// Aplicación móvil-first / PWA de una sola ruta (SPA interna).

import Providers from '@/components/menrut/Providers'
import AppShell from '@/components/menrut/AppShell'

export default function Home() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  )
}
