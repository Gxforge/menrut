// MENRUT v2 — Aislamiento efectivo de instancias Supabase.
// menrut-principal es la ÚNICA instancia de producción; menrut-secundario es
// un entorno de pruebas reservado. La API lo EXIGE en tiempo de ejecución:
// producción jamás apunta al secundario y las pruebas (IS_SANDBOX=1) jamás
// al principal. Se comprueba en cada request (ver router.ts).
import { HttpError, type V2Env } from './core';

export const PRODUCTION_SUPABASE_HOST = 'rblwyhtjfqvdymetgyya.supabase.co';

export function assertSupabaseIsolation(env: V2Env): void {
  if (!env.SUPABASE_URL) return; // sin auth configurada (p. ej. CI local).
  let host = '';
  try {
    host = new URL(env.SUPABASE_URL).hostname;
  } catch {
    throw new HttpError(503, 'Configuración de autenticación no válida.');
  }
  const sandbox = env.IS_SANDBOX === '1';
  if (!sandbox && host !== PRODUCTION_SUPABASE_HOST) {
    throw new HttpError(503, 'Esta API no está conectada a la instancia de producción de MENRUT.');
  }
  if (sandbox && host === PRODUCTION_SUPABASE_HOST) {
    throw new HttpError(503, 'El entorno de pruebas no puede usar la instancia de producción.');
  }
}
