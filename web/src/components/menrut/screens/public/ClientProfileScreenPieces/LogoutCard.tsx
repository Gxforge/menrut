// MENRUT — ClientProfileScreen · cierre de sesión con confirmación.
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, LogOut } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { signOutSupabase } from '@/lib/auth'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// ─── Cierre de sesión ───────────────────────────────────────────────────────

export function LogoutCard() {
  const logout = useAppStore((s) => s.logout)
  const resetTo = useAppStore((s) => s.resetTo)
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doLogout() {
    setBusy(true)
    try {
      await signOutSupabase()
    } catch {
      // La sesión local se cierra igualmente; Supabase reintenta en segundo plano.
    }
    qc.clear()
    logout()
    resetTo('home')
    toast.success('Sesión cerrada. ¡Hasta pronto!')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/10',
          'h-12 text-[14px] font-semibold text-danger transition-transform active:scale-[0.98]'
        )}
      >
        <LogOut className="h-4.5 w-4.5" aria-hidden />
        Cerrar sesión
      </button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="mx-4 max-w-[360px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Volverás a la pantalla de inicio y deberás entrar de nuevo para acceder a tu cuenta, tus guardados y tus mensajes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 rounded-full" disabled={busy}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-full bg-danger font-semibold hover:bg-danger/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                doLogout()
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
