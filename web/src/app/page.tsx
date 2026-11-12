import type { Metadata } from 'next'
import { Landing } from '@/components/marketing/Landing'

// Portada pública de MENRUT. La aplicación vive en /app/.
export const metadata: Metadata = {
  title: 'MENRUT · Conectamos caminos.',
  description:
    'Encuentra mensajeros que cubran tu ruta en Cuba. Clientes, mensajeros y negocios conectados por rutas y confianza.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'MENRUT · Conectamos caminos.',
    description: 'Cada recorrido conecta una oportunidad.',
    url: '/',
    siteName: 'MENRUT',
    type: 'website',
  },
}

export default function Home() {
  return <Landing />
}
