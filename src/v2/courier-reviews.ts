// MENRUT v2 — Respuesta del mensajero a una reseña de su pasaporte. La
// respuesta vive junto a la reseña (shard dueño), se puede editar y notifica
// al autor una sola vez por guardado (rate-limited).
import {
  asString,
  checkRate,
  HttpError,
  newId,
  nowMs,
  requireExactRole,
  type V2Env,
} from './core';
import { requireAuth } from './identity';
import { assignedShard } from './shard';
import { toReviewDto } from './dto';

const MAX_RESPONSE = 600;

/** ─── POST /courier/me/reviews/:id/respond ─────────────────────────────── */
export async function respondReview(request: Request, env: V2Env, reviewId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { user } = await requireAuth(request, env);
  requireExactRole(user.role, 'courier');
  await checkRate(env, `respond:${user.id}`, 15, 60_000);

  const response = (asString(body.response) ?? '').trim();
  if (!response) throw new HttpError(400, 'La respuesta no puede estar vacía.');
  if (response.length > MAX_RESPONSE) throw new HttpError(400, `La respuesta es demasiado larga (máx. ${MAX_RESPONSE} caracteres).`);

  const shard = await assignedShard(env, user.id);
  if (!shard) throw new HttpError(409, 'Tu perfil de mensajero no está creado.');

  const review = await shard.db
    .prepare('SELECT * FROM reviews WHERE id=? AND courier_id=? LIMIT 1')
    .bind(reviewId, user.id)
    .first<Record<string, unknown>>();
  if (!review) throw new HttpError(404, 'Reseña no encontrada en tu pasaporte.');
  if (review.status !== 'published') throw new HttpError(409, 'La reseña no está publicada.');

  const isFirst = !review.response;
  await shard.db
    .prepare('UPDATE reviews SET response=? WHERE id=? AND courier_id=?')
    .bind(response, reviewId, user.id)
    .run();

  // Notifica al autor solo la primera vez (las ediciones no molestan).
  if (isFirst) {
    await env.D1_CORE
      .prepare("INSERT INTO notifications(id,user_id,category,title,body) VALUES(?,?,'resena','Respuesta del mensajero',?)")
      .bind(newId(), review.author_id as string, `${user.fullName} respondió tu reseña: «${response.slice(0, 80)}${response.length > 80 ? '…' : ''}»`)
      .run();
  }

  const author = await env.D1_CORE
    .prepare('SELECT full_name FROM account_profiles WHERE user_id=?')
    .bind(review.author_id as string)
    .first<{ full_name: string }>();

  return {
    review: toReviewDto(
      {
        id: review.id as string,
        rating: review.rating as number,
        comment: review.comment as string,
        isVerified: review.is_verified as number,
        response,
        createdAt: review.created_at as number,
      },
      author?.full_name ?? 'Usuario MENRUT',
    ),
    updatedAt: new Date(nowMs()).toISOString(),
  };
}
