// MENRUT v2 — Envoltorio de la API operativa (/api/v2/*) para Pages Functions.
// Aplica CORS (mismo origen + ALLOWED_ORIGIN), exige JSON (salvo la subida de
// capturas multipart), limita el payload y responde con {error: mensaje}.
// Además dispara la reconciliación programada (cada 6 h) en background vía
// waitUntil: nunca bloquea ni rompe la request del usuario.
import { route } from '../../../src/v2/router';
import { HttpError, type V2Env } from '../../../src/v2/core';
import { maybeStartScheduled } from '../../../src/v2/reconcile';

export const onRequest: PagesFunction<V2Env> = async ({ request, env, waitUntil }) => {
  // Reconciliación programada por tráfico (si toca; barato: 1 SELECT).
  try {
    waitUntil(maybeStartScheduled(env));
  } catch {
    /* opcional en runtimes sin waitUntil */
  }
  const requestId = crypto.randomUUID();
  const origin = request.headers.get('Origin');
  const sameOrigin = origin === new URL(request.url).origin;
  const originAllowed = !!origin && (sameOrigin || origin === env.ALLOWED_ORIGIN);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    'Vary': 'Origin',
  };
  if (originAllowed) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  }
  try {
    if (origin && !originAllowed) throw new HttpError(403, 'Origen no permitido.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean).slice(2);
    const isMultipart =
      request.method === 'POST' && segments[0] === 'payments' && segments.length === 3 && segments[2] === 'proof';

    let apiRequest: Request = request;
    if (['POST', 'PATCH', 'PUT'].includes(request.method) && !isMultipart) {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
        throw new HttpError(415, 'Formato de solicitud no válido.');
      }
      // Lee el stream con tope (incluidas solicitudes fragmentadas).
      const reader = request.body?.getReader();
      let size = 0;
      const parts: Uint8Array[] = [];
      if (reader) {
        while (true) {
          const r = await reader.read();
          if (r.done) break;
          size += r.value.byteLength;
          if (size > 65536) {
            await reader.cancel();
            throw new HttpError(413, 'La solicitud es demasiado grande.');
          }
          parts.push(r.value);
        }
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const p of parts) {
        bytes.set(p, offset);
        offset += p.length;
      }
      apiRequest = new Request(request.url, { method: request.method, headers: request.headers, body: bytes });
    }

    const result = await route(apiRequest, env, url);
    return new Response(JSON.stringify(result.json), { headers: { ...headers, ...(result.headers ?? {}) } });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      console.error('[v2] Error interno:', error instanceof Error ? error.stack : error);
    }
    const e =
      error instanceof HttpError
        ? error
        : new HttpError(500, 'Error interno del servidor. Inténtalo de nuevo.');
    return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers });
  }
};
