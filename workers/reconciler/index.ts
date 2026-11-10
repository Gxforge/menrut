// MENRUT — Worker programado «menrut-reconciler» (cron cada 6 h).
// No toca datos: solo llama a la API de producción con el secreto compartido
// (POST /api/v2/cron/reconcile, cabecera X-Cron-Secret). Toda la lógica vive
// en la API (src/v2/reconcile.ts); este worker es el reloj externo.
// Despliegue: bash scripts/deploy_reconciler.sh (requiere token de Cloudflare).
export interface Env {
  RECONCILE_URL: string; // https://menrut.pages.dev/api/v2/cron/reconcile
  CRON_SECRET: string; // igual que la variable CRON_SECRET del proyecto Pages
}

async function reconcile(env: Env): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(env.RECONCILE_URL, {
      method: 'POST',
      headers: { 'X-Cron-Secret': env.CRON_SECRET, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = (await res.text()).slice(0, 400);
    console.log(`reconcile → ${res.status}: ${body}`);
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    console.error('reconcile falló:', e);
    return { ok: false, status: 0, body: String(e) };
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(reconcile(env));
  },
  // Prueba manual: wrangler dev + curl localhost:8787/__scheduled
  async fetch(): Promise<Response> {
    return new Response('menrut-reconciler: usa el cron (scheduled).', { status: 200 });
  },
};
