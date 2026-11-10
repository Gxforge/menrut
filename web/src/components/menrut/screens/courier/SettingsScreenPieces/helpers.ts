// MENRUT — SettingsScreen · Tipos y constantes de las preferencias de avisos.
export interface Avisos {
  mensajes: boolean
  rutas: boolean
  valoraciones: boolean
}

export const AVISOS_INICIALES: Avisos = { mensajes: true, rutas: true, valoraciones: true }
export const AVISOS_KEY = 'menrut-avisos'
