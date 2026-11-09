// MENRUT — Autenticación real con Supabase Auth
import { getSupabase } from './supabase'
import type { SessionUser } from './types'

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token ?? null
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  const { error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
}

export async function sendRecoveryEmail(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email)
  if (error) throw error
}

export async function signOutSupabase(): Promise<void> {
  await getSupabase().auth.signOut()
}

// Sincroniza la identidad Supabase con nuestro usuario en la BD operativa.
// Devuelve el usuario MENRUT (creándolo si es la primera vez).
export async function syncUserWithBackend(role?: string): Promise<SessionUser> {
  const token = await getAccessToken()
  if (!token) throw new Error('No hay sesión activa')
  const res = await fetch('/api/v2/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(role ? { role } : {}),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'No se pudo sincronizar la cuenta')
  }
  const { user } = await res.json()
  return user as SessionUser
}
