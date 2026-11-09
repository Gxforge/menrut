// MENRUT — Hooks compartidos (TanStack Query + store)
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { getSupabase } from '@/lib/supabase'
import { syncUserWithBackend, readPendingRole, clearPendingRole } from '@/lib/auth'
import type { SessionUser } from '@/lib/types'

// Favorito local con sincronización al backend
export function useToggleFavorite(courierId: string, initial: boolean) {
  const [favorite, setFavorite] = useState(initial)
  const qc = useQueryClient()
  const session = useAppStore((s) => s.session)

  const mutation = useMutation({
    mutationFn: () => api.toggleFavorite(courierId),
    onMutate: () => setFavorite((v) => !v),
    onError: () => {
      setFavorite((v) => !v) // revertir
      toast.error('No se pudo guardar el favorito. Inténtalo de nuevo.')
    },
    onSuccess: (data) => setFavorite(data.favorite),
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const toggle = useCallback(() => {
    if (!session) {
      toast.info('Inicia sesión para guardar favoritos')
      useAppStore.getState().navigate('login')
      return
    }
    mutation.mutate()
  }, [mutation, session])

  return { favorite, toggle, isPending: mutation.isPending }
}

// Restaurar sesión real de Supabase al arrancar la app.
// Incluye un «perro guardián»: pase lo que pase (red caída, Supabase lento),
// a los 6 s la app queda lista — la pantalla de carga nunca se queda eterna.
export function useSessionBootstrap() {
  const setSession = useAppStore((s) => s.setSession)
  const session = useAppStore((s) => s.session)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Perro guardián: garantiza ready=true aunque todo lo demás falle
    const watchdog = setTimeout(() => {
      if (!cancelled) setReady(true)
    }, 6_000)
    async function restore() {
      try {
        const { data } = await getSupabase().auth.getSession()
        if (cancelled) return
        if (data.session) {
          // Rol pendiente del registro: si Supabase exigió confirmación por
          // correo, el flujo se cortó y la API v2 de producción (que solo
          // acepta role por body) crearía la cuenta como «client». Se
          // reaplica aquí y se limpia SOLO si el sync tiene éxito; si falla,
          // queda guardado para el siguiente intento.
          const pendingRole = readPendingRole()
          const user = await syncUserWithBackend(pendingRole ?? undefined)
          if (!cancelled) setSession(user)
          clearPendingRole()
        } else {
          // Sin sesión en Supabase: limpiar cualquier sesión fantasma que
          // hubiera quedado persistida en el store (p. ej. cuenta borrada).
          setSession(null)
        }
      } catch {
        // Si Supabase sigue teniendo sesión (backend caído temporalmente)
        // conservamos la sesión persistida; si no, limpiamos la fantasma.
        const retry = await getSupabase()
          .auth.getSession()
          .catch(() => null)
        if (!cancelled && !retry?.data?.session) setSession(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    restore()
    return () => {
      cancelled = true
      clearTimeout(watchdog)
    }
  }, [])

  return { session, ready }
}

// Cantidad de notificaciones sin leer (badge)
export function useUnreadNotifications() {
  const session = useAppStore((s) => s.session)
  const { data } = useQuery({
    queryKey: ['notifications', session?.id],
    queryFn: () => api.notifications(),
    enabled: !!session,
    refetchInterval: 60000,
    select: (d) => d.notifications.filter((n) => n.readAt === null).length,
  })
  return data ?? 0
}

// Cantidad de conversaciones con mensajes sin leer (badge)
export function useUnreadMessages() {
  const session = useAppStore((s) => s.session)
  const { data } = useQuery({
    queryKey: ['conversations', session?.id],
    queryFn: () => api.conversations(),
    enabled: !!session,
    refetchInterval: 45000,
    select: (d) => d.conversations.reduce((acc, c) => acc + c.unread, 0),
  })
  return data ?? 0
}

// Sincroniza sesión tras login/registro. Si no llega rol explícito se
// reaplica el pendiente del registro (la API v2 de producción no lee los
// metadatos de Supabase); tras un sync exitoso el pendiente se limpia.
export async function completeLogin(role?: string): Promise<SessionUser> {
  const user = await syncUserWithBackend(role ?? readPendingRole() ?? undefined)
  useAppStore.getState().setSession(user)
  clearPendingRole()
  return user
}
