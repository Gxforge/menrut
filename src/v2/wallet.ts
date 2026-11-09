// MENRUT v2 — Carteras: reconciliación lazy de permanencia (regla 8.3) y
// activación de la prueba gratuita. Puerta única para acreditar/consumir
// créditos; toda escritura multi-tabla va en un batch D1 atómico.
import { HttpError, newId, nowMs, type V2Env } from './core';
import type { MembershipWithPlanRow, WalletRow } from './dto';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const BLOCK_COST = 5; // 12 h reales = 5 créditos
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getWallet(env: V2Env, courierProfileId: string): Promise<WalletRow | null> {
  return (await env.D1_CORE.prepare('SELECT * FROM Wallet WHERE courierId=? LIMIT 1')
    .bind(courierProfileId)
    .first()) as WalletRow | null;
}

export async function getActiveMembership(env: V2Env, courierProfileId: string): Promise<MembershipWithPlanRow | null> {
  return (await env.D1_CORE.prepare(
    `SELECT m.id, m.courierId, m.planId, m.startedAt, m.expiresAt, m.status,
     mp.name AS planName, mp.code AS planCode
     FROM Membership m JOIN MembershipPlan mp ON mp.id = m.planId
     WHERE m.courierId=? AND m.status='active' AND m.expiresAt > ?
     ORDER BY m.expiresAt DESC LIMIT 1`
  )
    .bind(courierProfileId, nowMs())
    .first()) as MembershipWithPlanRow | null;
}

/** Reconcilia la cartera de permanencia con el reloj del servidor. */
export async function reconcileWallet(env: V2Env, courierProfileId: string): Promise<WalletRow | null> {
  const db = env.D1_CORE;
  const wallet = await getWallet(env, courierProfileId);
  if (!wallet) return null;
  const now = nowMs();

  if (wallet.permanenceCredits > 0 && wallet.lastConsumedAt) {
    const elapsed = now - wallet.lastConsumedAt;
    const blocks = Math.floor(elapsed / TWELVE_HOURS_MS);
    if (blocks > 0) {
      const deduct = Math.min(wallet.permanenceCredits, blocks * BLOCK_COST);
      const remaining = wallet.permanenceCredits - deduct;
      const stmts: D1PreparedStatement[] = [
        db
          .prepare('UPDATE Wallet SET permanenceCredits=?, lastConsumedAt=?, updatedAt=? WHERE id=?')
          .bind(remaining, now, now, wallet.id),
        db
          .prepare(
            'INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)'
          )
          .bind(
            newId(), wallet.id, 'permanence', null, 'Consumo de permanencia', null,
            wallet.permanenceCredits, -deduct, remaining, now,
          ),
      ];
      if (remaining === 0) {
        // Permanencia agotada: perfil oculto (NO se borra nada) y membresía vence.
        stmts.push(
          db.prepare('UPDATE CourierProfile SET isPublic=0, updatedAt=? WHERE id=?').bind(now, courierProfileId),
          db
            .prepare("UPDATE Membership SET status='expired' WHERE courierId=? AND status='active'")
            .bind(courierProfileId),
        );
      }
      await db.batch(stmts);
      return { ...wallet, permanenceCredits: remaining, lastConsumedAt: now };
    }
    return wallet;
  }

  if (wallet.permanenceCredits > 0 && !wallet.lastConsumedAt) {
    // Primer acceso con saldo: arranca el consumo.
    await db.prepare('UPDATE Wallet SET lastConsumedAt=?, updatedAt=? WHERE id=?').bind(now, now, wallet.id).run();
    return { ...wallet, lastConsumedAt: now };
  }

  return wallet;
}

/** Activa el plan de prueba (una sola vez por cuenta) creando todo el rastro. */
export async function activateTrialPlan(
  env: V2Env,
  userId: string,
  courierProfileId: string,
): Promise<{ code: string; name: string; durationDays: number; permanenceCredits: number } | null> {
  const db = env.D1_CORE;
  const plan = await db
    .prepare('SELECT * FROM MembershipPlan WHERE isTrial=1 ORDER BY sortOrder ASC LIMIT 1')
    .first<{
      id: string;
      code: string;
      name: string;
      durationDays: number;
      permanenceCredits: number;
    }>();
  if (!plan) return null;

  const now = nowMs();
  const expiresAt = now + plan.durationDays * DAY_MS;
  const stmts: D1PreparedStatement[] = [
    db
      .prepare(
        "INSERT INTO Membership(id,courierId,planId,startedAt,expiresAt,status,createdAt) VALUES(?,?,?,?,'active',?)"
      )
      .bind(newId(), courierProfileId, plan.id, now, expiresAt, now),
    db.prepare('UPDATE User SET hasUsedTrial=1, updatedAt=? WHERE id=?').bind(now, userId),
    db
      .prepare(
        "INSERT INTO Notification(id,userId,category,title,body,readAt,createdAt) VALUES(?,?,?,'Bienvenido a MENRUT',?,?,NULL,?)"
      )
      .bind(
        newId(), userId, 'membresia',
        `Tu prueba gratuita de ${plan.durationDays} días está activa: ${plan.permanenceCredits} créditos de permanencia.`,
        now,
      ),
  ];

  const wallet = await getWallet(env, courierProfileId);
  if (wallet && plan.permanenceCredits > 0) {
    const after = wallet.permanenceCredits + plan.permanenceCredits;
    stmts.push(
      db.prepare('UPDATE Wallet SET permanenceCredits=?, updatedAt=? WHERE id=?').bind(after, now, wallet.id),
      db
        .prepare(
          'INSERT INTO WalletTransaction(id,walletId,walletType,actorId,reason,reference,balanceBefore,delta,balanceAfter,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(
          newId(), wallet.id, 'permanence', null, `Prueba gratuita (${plan.durationDays} días)`,
          plan.code, wallet.permanenceCredits, plan.permanenceCredits, after, now,
        ),
    );
  }

  await db.batch(stmts);
  return plan;
}

/** Perfil de mensajero del usuario; 409 con mensaje claro si falta. */
export async function requireCourierProfile(
  env: V2Env,
  userId: string,
): Promise<{ id: string; coverageType: string; isPublic: number }> {
  const profile = await env.D1_CORE.prepare(
    'SELECT id, coverageType, isPublic FROM CourierProfile WHERE userId=? LIMIT 1'
  )
    .bind(userId)
    .first();
  if (!profile) {
    throw new HttpError(409, 'Tu perfil de mensajero no está creado. Cierra sesión y vuelve a entrar.');
  }
  return profile as { id: string; coverageType: string; isPublic: number };
}
