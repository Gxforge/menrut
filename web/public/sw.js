/* MENRUT — Service Worker (PWA instalable con soporte offline).
 * Estrategias:
 *  · Navegación (documentos): red primero; sin red → /offline.html.
 *  · Estáticos con hash (/_next/static/*) y marca (/menrut/*): cache first.
 *  · API (/api/v2/*): SIEMPRE red (datos frescos); nunca se cachea.
 * Nunca intercepta rangos ni métodos que no sean GET.
 */
const VERSION = 'menrut-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline'; // Pages sirve la URL limpia (sin .html).

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // recursos de terceros: directos.
  if (url.pathname.startsWith('/api/')) return; // API: siempre red.

  // Documentos (navegación): red primero con respaldo offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL)),
      ),
    );
    return;
  }

  // Estáticos inmutables y marca: cache first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/menrut/') ||
    url.pathname.startsWith('/brand/')
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
