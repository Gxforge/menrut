// MENRUT — Estado de la recuperación de contraseña.
// Cuando Supabase abre el enlace del correo, crea una sesión temporal y emite
// PASSWORD_RECOVERY. Guardamos ese estado en sessionStorage para que sobreviva
// a una recarga y para que la app no mande al usuario a su cuenta antes de
// que elija la contraseña nueva.
const RECOVERY_KEY = 'menrut:password-recovery'

export function markPasswordRecovery(): void {
  try {
    sessionStorage.setItem(RECOVERY_KEY, '1')
  } catch {
    /* sin sessionStorage el flujo sigue, pero sin protección ante recarga */
  }
}

export function isPasswordRecovery(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === '1'
  } catch {
    return false
  }
}

export function clearPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(RECOVERY_KEY)
  } catch {
    /* nada que limpiar */
  }
}
