// MENRUT — Worker programado «menrut-reconciler».
// · cada 6 h: reconciliación. · cada hora (minuto 5): retención del chat (24 h en servidor).
// No toca datos: solo llama a la API de producción con el secreto compartido
// (POST /api/v2/cron/reconcile, cabecera X-Cron-Secret). Toda la lógica vive
// en la API (src/v2/reconcile.ts); este worker es el reloj externo.
// Despliegue: bash scripts/deploy_reconciler.sh (requiere token de Cloudflare).
export interface Env {
  RECONCILE_URL: string; // https://menrut.pages.dev/api/v2/cron/reconcile
  CHAT_RETENTION_URL: string; // https://menrut.pages.dev/api/v2/cron/chat-retention
  CRON_SECRET: string; // igual que la variable CRON_SECRET del proyecto Pages
}

const HOURLY_CRON = '5 * * * *';

async function post(url: string, env: Env): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Cron-Secret': env.CRON_SECRET, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = (await res.text()).slice(0, 400);
    console.log(`${url} → ${res.status}: ${body}`);
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    console.error(`${url} falló:`, e);
    return { ok: false, status: 0, body: String(e) };
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const url = controller.cron === HOURLY_CRON ? env.CHAT_RETENTION_URL : env.RECONCILE_URL;
    ctx.waitUntil(post(url, env));
  },
  // Prueba manual: wrangler dev + curl localhost:8787/__scheduled
  async fetch(): Promise<Response> {
    return new Response('menrut-reconciler: usa el cron (scheduled).', { status: 200 });
  },
};
