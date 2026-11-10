// MENRUT — Perfil del cliente
// Cabecera con avatar (subida real a Supabase, WebP), datos de cuenta, actividad,
// soporte, privacidad y cierre de sesión.
// Exporta bloques compartidos (TabHeader, ProfileHeader, AccountCard…) que
// reutilizan el resto de pantallas secundarias de cliente y BusinessProfileScreen.
// Los bloques viven en ./ClientProfileScreenPieces/ y se re-exportan aquí para
// mantener la ruta de importación que usan las demás pantallas.
'use client'

import { useAppStore } from '@/lib/store'
import { TabHeader } from './ClientProfileScreenPieces/TabHeader'
import { SessionGate } from './ClientProfileScreenPieces/SessionGate'
import { ProfileHeader } from './ClientProfileScreenPieces/ProfileHeader'
import { AccountCard } from './ClientProfileScreenPieces/AccountCard'
import { ActivityCard } from './ClientProfileScreenPieces/ActivityCard'
import { SupportCard } from './ClientProfileScreenPieces/SupportCard'
import { PrivacyCard } from './ClientProfileScreenPieces/PrivacyCard'
import { LogoutCard } from './ClientProfileScreenPieces/LogoutCard'
import { BusinessLinkCard, SwitchToCourierCard } from './ClientProfileScreenPieces/ClientOnlyCards'

// Contrato público del módulo: bloques compartidos por otras pantallas.
export { TabHeader } from './ClientProfileScreenPieces/TabHeader'
export { SessionGate } from './ClientProfileScreenPieces/SessionGate'
export { ProfileHeader } from './ClientProfileScreenPieces/ProfileHeader'
export { AccountCard } from './ClientProfileScreenPieces/AccountCard'
export { ActivityCard } from './ClientProfileScreenPieces/ActivityCard'
export { SupportCard } from './ClientProfileScreenPieces/SupportCard'
export { PrivacyCard } from './ClientProfileScreenPieces/PrivacyCard'
export { LogoutCard } from './ClientProfileScreenPieces/LogoutCard'

// ─── Pantalla: Perfil del cliente ───────────────────────────────────────────

export default function ClientProfileScreen() {
  const session = useAppStore((s) => s.session)

  if (!session) return <SessionGate feature="Tu perfil" />

  return (
    <div className="pb-10">
      <TabHeader title="Mi perfil" subtitle="Tu espacio en MENRUT" />
      <div className="space-y-4 px-4 pt-4">
        <ProfileHeader session={session} />
        <AccountCard session={session} />
        <ActivityCard />
        {session.role === 'business' && <BusinessLinkCard />}
        {session.role === 'client' && <SwitchToCourierCard />}
        <SupportCard />
        <PrivacyCard />
        <div className="pt-1">
          <LogoutCard />
        </div>
        <p className="pt-1 text-center text-[10.5px] tracking-wide text-muted-foreground">
          MENRUT · Conectamos caminos.
        </p>
      </div>
    </div>
  )
}
