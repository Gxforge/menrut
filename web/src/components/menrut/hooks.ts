// MENRUT — Hooks compartidos (TanStack Query + store)
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { getSupabase } from '@/lib/supabase'
import { syncUserWithBackend } from '@/lib/auth'
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

// Restaurar sesión real de Supabase al arrancar la app
export function useSessionBootstrap() {
  const setSession = useAppStore((s) => s.setSession)
  const session = useAppStore((s) => s.session)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const { data } = await getSupabase().auth.getSession()
        if (data.session && !cancelled) {
          const user = await syncUserWithBackend()
          if (!cancelled) setSession(user)
        }
      } catch {
        // sin sesión o backend caído: la app sigue como visitante
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    restore()
    return () => {
      cancelled = true
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

// Sincroniza sesión tras login/registro
export async function completeLogin(role?: string): Promise<SessionUser> {
  const user = await syncUserWithBackend(role)
  useAppStore.getState().setSession(user)
  return user
}
