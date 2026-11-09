// MENRUT — PWA de una sola ruta. SPA interna con navegación por pantallas
// (Zustand), datos con TanStack Query y auth real con Supabase.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Providers from './components/menrut/Providers'
import AppShell from './components/menrut/AppShell'
import { Toaster } from './components/ui/sonner'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AppShell />
      <Toaster position="top-center" richColors />
    </Providers>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Offline remains optional. */
    })
  })
}
