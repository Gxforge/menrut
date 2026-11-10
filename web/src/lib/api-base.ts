// MENRUT — Base de la API
// En desarrollo el backend Next.js local sirve /api/*; en producción
// (Cloudflare Pages) el frontend se exporta estático y consume la API v2 ya
// desplegada en Pages Functions con D1 (/api/v2/*). El valor se fija en
// tiempo de build con NEXT_PUBLIC_API_BASE.
export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE || '/api'
