// MENRUT v2 — Router de la API operativa (montada en /api/v2/*).
// Cada ruta delega en su módulo; el envoltorio de functions/api/v2 aplica
// CORS, límites de payload y el sobre de errores {error: mensaje}.
// v3: identidad global + shards D1 (ver identity.ts, shard.ts).
import type { V2Env } from './core';
import { HttpError } from './core';
import { plans, popularRoutes, search, territories, tools } from './public';
import { passport, submitReview } from './passport';
import {
  authSync,
  createReport,
  createSavedRoute,
  deleteSavedRoute,
  listFavorites,
  listSavedRoutes,
  toggleFavorite,
  updateMe,
} from './account';
import {
  listConversations,
  listMessages,
  listNotifications,
  markNotificationRead,
  sendMessage,
  startConversation,
} from './social';
import {
  courierDashboard,
  courierReviews,
  courierWallet,
  requestMembership,
  submitVerification,
  updateCourierProfile,
} from './courier';
import {
  createCourierRoute,
  deleteCourierRoute,
  listCourierRoutes,
  updateCourierRoute,
} from './courier-routes';
import { myPayments, requestPlan, uploadProof } from './payments';
import {
  adminAccounts,
  adminCouriers,
  adminOverview,
  adminReviewVerification,
} from './admin';
import { adminDecidePayment, adminPayments } from './admin-payments';
import {
  adminGetConfig,
  adminModeration,
  adminResolveReport,
  adminSaveConfig,
  adminSavePlan,
  adminSaveTool,
  adminSystem,
} from './admin-config';
import { adminDatabases } from './admin-databases';

export interface RouteResult {
  json: unknown;
  headers?: Record<string, string>;
}

const CACHE_TERRITORIES = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' };
const CACHE_1H = { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' };
const CACHE_10M = { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' };

export async function route(request: Request, env: V2Env, url: URL): Promise<RouteResult> {
  const segments = url.pathname.split('/').filter(Boolean); // ['api','v2',...]
  const path = segments.slice(2);
  const method = request.method.toUpperCase();

  const isMultipart = method === 'POST' && path[0] === 'payments' && path.length === 3 && path[2] === 'proof';
  let body: Record<string, unknown> = {};
  if (['POST', 'PATCH', 'PUT'].includes(method) && !isMultipart) {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  // ─── Público ───
  if (method === 'GET' && path[0] === 'territories' && path.length === 1) {
    return { json: await territories(env), headers: CACHE_TERRITORIES };
  }
  if (method === 'GET' && path[0] === 'search' && path.length === 1) {
    return { json: await search(request, env, url) };
  }
  if (path[0] === 'couriers') {
    if (method === 'GET' && path.length === 2) return { json: await passport(request, env, path[1]) };
    if (method === 'POST' && path.length === 3 && path[2] === 'reviews') {
      return { json: await submitReview(request, env, path[1], body) };
    }
  }
  if (method === 'GET' && path[0] === 'plans' && path.length === 1) {
    return { json: await plans(env), headers: CACHE_1H };
  }
  if (method === 'GET' && path[0] === 'tools' && path.length === 1) {
    return { json: await tools(env), headers: CACHE_1H };
  }
  if (method === 'GET' && path[0] === 'routes' && path[1] === 'popular' && path.length === 2) {
    return { json: await popularRoutes(env), headers: CACHE_10M };
  }

  // ─── Sesión y cuenta ───
  if (method === 'POST' && path[0] === 'auth' && path[1] === 'sync' && path.length === 2) {
    return { json: await authSync(request, env, body) };
  }
  if (method === 'PATCH' && path[0] === 'me' && path.length === 1) {
    return { json: await updateMe(request, env, body) };
  }
  if (method === 'POST' && path[0] === 'reports' && path.length === 1) {
    return { json: await createReport(request, env, body) };
  }

  // ─── Favoritos y guardados ───
  if (path[0] === 'favorites' && path.length === 1) {
    if (method === 'GET') return { json: await listFavorites(request, env) };
    if (method === 'POST') return { json: await toggleFavorite(request, env, body) };
  }
  if (path[0] === 'saved-routes') {
    if (method === 'GET' && path.length === 1) return { json: await listSavedRoutes(request, env) };
    if (method === 'POST' && path.length === 1) return { json: await createSavedRoute(request, env, body) };
    if (method === 'DELETE' && path.length === 2) return { json: await deleteSavedRoute(request, env, path[1]) };
  }

  // ─── Mensajes ───
  if (path[0] === 'conversations') {
    if (method === 'GET' && path.length === 1) return { json: await listConversations(request, env) };
    if (method === 'POST' && path.length === 1) return { json: await startConversation(request, env, body) };
    if (path.length === 3 && path[2] === 'messages') {
      if (method === 'GET') return { json: await listMessages(request, env, path[1]) };
      if (method === 'POST') return { json: await sendMessage(request, env, path[1], body) };
    }
  }

  // ─── Notificaciones ───
  if (method === 'GET' && path[0] === 'notifications' && path.length === 1) {
    return { json: await listNotifications(request, env) };
  }
  if (method === 'POST' && path[0] === 'notifications' && path.length === 3 && path[2] === 'read') {
    return { json: await markNotificationRead(request, env, path[1]) };
  }

  // ─── Mensajero ───
  if (path[0] === 'courier' && path[1] === 'me') {
    if (method === 'GET' && path.length === 2) return { json: await courierDashboard(request, env) };
    if (method === 'PATCH' && path.length === 2) return { json: await updateCourierProfile(request, env, body) };
    if (path[2] === 'routes') {
      if (method === 'GET' && path.length === 3) return { json: await listCourierRoutes(request, env) };
      if (method === 'POST' && path.length === 3) return { json: await createCourierRoute(request, env, body) };
      if ((method === 'PATCH' || method === 'PUT') && path.length === 4) {
        return { json: await updateCourierRoute(request, env, path[3], body) };
      }
      if (method === 'DELETE' && path.length === 4) return { json: await deleteCourierRoute(request, env, path[3]) };
    }
    if (method === 'GET' && path[2] === 'reviews' && path.length === 3) {
      return { json: await courierReviews(request, env) };
    }
    if (method === 'GET' && path[2] === 'wallet' && path.length === 3) {
      return { json: await courierWallet(request, env) };
    }
    if (method === 'POST' && path[2] === 'membership' && path.length === 3) {
      return { json: await requestMembership(request, env, body) };
    }
    if (method === 'POST' && path[2] === 'verification' && path.length === 3) {
      return { json: await submitVerification(request, env, body) };
    }
  }

  // ─── Pagos (Transfermóvil) ───
  if (path[0] === 'payments') {
    if (method === 'POST' && path[1] === 'request' && path.length === 2) {
      return { json: await requestPlan(request, env, body) };
    }
    if (method === 'POST' && path.length === 3 && path[2] === 'proof') {
      return { json: await uploadProof(request, env, path[1]) };
    }
    if (method === 'GET' && path[1] === 'mine' && path.length === 2) {
      return { json: await myPayments(request, env) };
    }
  }

  // ─── Administración ───
  if (path[0] === 'admin') {
    if (method === 'GET' && path[1] === 'overview' && path.length === 2) return { json: await adminOverview(request, env) };
    if (method === 'GET' && path[1] === 'couriers' && path.length === 2) return { json: await adminCouriers(request, env, url) };
    if (method === 'PATCH' && path[1] === 'couriers' && path.length === 4 && path[3] === 'verification') {
      return { json: await adminReviewVerification(request, env, path[2], body) };
    }
    if (method === 'GET' && path[1] === 'accounts' && path.length === 2) return { json: await adminAccounts(request, env) };
    if (method === 'GET' && path[1] === 'payments' && path.length === 2) return { json: await adminPayments(request, env, url) };
    if (method === 'POST' && path[1] === 'payments' && path.length === 4 && path[3] === 'decide') {
      return { json: await adminDecidePayment(request, env, path[2], body) };
    }
    if (method === 'POST' && path[1] === 'plans' && path.length === 2) return { json: await adminSavePlan(request, env, body) };
    if (method === 'POST' && path[1] === 'tools' && path.length === 2) return { json: await adminSaveTool(request, env, body) };
    if (method === 'GET' && path[1] === 'moderation' && path.length === 2) return { json: await adminModeration(request, env) };
    if (method === 'PATCH' && path[1] === 'reports' && path.length === 3) {
      return { json: await adminResolveReport(request, env, path[2], body) };
    }
    if (method === 'GET' && path[1] === 'system' && path.length === 2) return { json: await adminSystem(request, env) };
    if (method === 'GET' && path[1] === 'databases' && path.length === 2) {
      return { json: await adminDatabases(request, env), headers: { 'Cache-Control': 'no-store' } };
    }
    if (path[1] === 'config' && path.length === 2) {
      if (method === 'GET') return { json: await adminGetConfig(request, env) };
      if (method === 'POST') return { json: await adminSaveConfig(request, env, body) };
    }
  }

  throw new HttpError(404, 'Recurso no disponible.');
}
