// MENRUT — Versión visible de la app (se fija en el build con NEXT_PUBLIC_*).
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
export const APP_BUILD: string = process.env.NEXT_PUBLIC_APP_BUILD || 'dev'
export const APP_VERSION_LABEL = `Versión ${APP_VERSION} · ${APP_BUILD}`
