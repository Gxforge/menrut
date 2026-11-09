// MENRUT — Autenticación real con Supabase Auth
import { getSupabase } from './supabase'
import { API_BASE } from './api-base'
import type { SessionUser } from './types'

// Rol elegido al registrarse, pendiente de aplicarse en el primer sync.
// La API v2 de producción solo acepta role por body (no lee metadatos de
// Supabase), así que si el correo exige confirmación guardamos el rol aquí
// para no perderlo entre el registro y el primer login.
const PENDING_ROLE_KEY = 'menrut:pending-role'
const SIGNUP_ROLES = ['client', 'courier', 'business']

export function readPendingRole(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const role = localStorage.getItem(PENDING_ROLE_KEY)
    return role && SIGNUP_ROLES.includes(role) ? role : null
  } catch {
    return null
  }
}

export function clearPendingRole(): void {
  try {
    localStorage.removeItem(PENDING_ROLE_KEY)
  } catch {
    /* sin localStorage no hay nada que limpiar */
  }
}

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
  fullName: string,
  role: string = 'courier'
): Promise<void> {
  const { error } = await getSupabase().auth.signUp({
    email,
    password,
    // El rol se guarda en los metadatos: si Supabase exige confirmación por
    // correo, el rol elegido sobrevive al corte del flujo y se aplica en el
    // primer login. Además se persiste en localStorage porque la API v2 de
    // producción NO lee user_metadata (solo body.role del sync).
    options: { data: { full_name: fullName, account_role: role } },
  })
  if (error) throw error
  if (SIGNUP_ROLES.includes(role)) {
    try {
      localStorage.setItem(PENDING_ROLE_KEY, role)
    } catch {
      /* sin localStorage el rol se aplica solo si el login es inmediato */
    }
  }
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
  const res = await fetch(`${API_BASE}/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(role ? { role } : {}),
    signal: AbortSignal.timeout(12_000), // nunca colgar el arranque por la red
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'No se pudo sincronizar la cuenta')
  }
  const { user } = await res.json()
  return user as SessionUser
}
