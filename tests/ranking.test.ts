// Pruebas del ranking de mensajeros (lógica pura, trimestres y premios).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRanking,
  currentQuarterCode,
  isEligible,
  municipalityPublished,
  prizeFor,
  quarterBounds,
  rankScope,
  type CourierQuarterStat,
} from '../src/v2/ranking-core';

function c(over: Partial<CourierQuarterStat> & { courierId: string }): CourierQuarterStat {
  return {
    name: over.courierId,
    slug: over.courierId,
    provinceId: 'p1',
    municipalityId: 'm1',
    deliveries: 10,
    reviewCount: 5,
    ratingSum: 25,
    verifiedSince: 1000,
    ...over,
  };
}

test('elegibilidad: exige 10 entregas y 5 reseñas', () => {
  assert.equal(isEligible(c({ courierId: 'a', deliveries: 9 })), false);
  assert.equal(isEligible(c({ courierId: 'a', reviewCount: 4, ratingSum: 20 })), false);
  assert.equal(isEligible(c({ courierId: 'a', deliveries: 10, reviewCount: 5 })), true);
});

test('trimestre natural en Europe/Madrid: invierno (UTC+1) y verano (UTC+2)', () => {
  const q1 = quarterBounds('2026-Q1');
  assert.ok(q1);
  // 1 de enero 2026 00:00 en Madrid = 2025-12-31T23:00:00Z
  assert.equal(q1.startsAt, Date.UTC(2025, 11, 31, 23) / 1000);
  // 1 de abril 2026 00:00 en Madrid (ya es CEST, UTC+2) = 2026-03-31T22:00:00Z
  assert.equal(q1.endsAt, Date.UTC(2026, 2, 31, 22) / 1000);
  const q3 = quarterBounds('2026-Q3');
  assert.ok(q3);
  // 1 de julio 2026 00:00 en Madrid = 2026-06-30T22:00:00Z
  assert.equal(q3.startsAt, Date.UTC(2026, 5, 30, 22) / 1000);
});

test('formato de trimestre inválido se rechaza', () => {
  assert.equal(quarterBounds('2026-Q5'), null);
  assert.equal(quarterBounds('2026Q1'), null);
  assert.equal(quarterBounds('abril'), null);
});

test('trimestre actual según Madrid', () => {
  // 2026-10-13 12:00 UTC está en el cuarto trimestre
  assert.equal(currentQuarterCode(Date.UTC(2026, 9, 13, 12)), '2026-Q4');
  // 2026-03-31 23:30 UTC ya es 1 de abril en Madrid → segundo trimestre
  assert.equal(currentQuarterCode(Date.UTC(2026, 2, 31, 23, 30)), '2026-Q2');
});

test('premios: nacional solo el 1.º al 50 %; provincial 35/30/25; municipal 20/15/10', () => {
  assert.equal(prizeFor('national', 1), 50);
  assert.equal(prizeFor('national', 2), null);
  assert.equal(prizeFor('province', 1), 35);
  assert.equal(prizeFor('province', 2), 30);
  assert.equal(prizeFor('province', 3), 25);
  assert.equal(prizeFor('province', 4), null);
  assert.equal(prizeFor('municipality', 3), 10);
  assert.equal(prizeFor('municipality', 0), null);
});

test('publicación municipal: mínimo 10 verificados', () => {
  assert.equal(municipalityPublished(9), false);
  assert.equal(municipalityPublished(10), true);
});

test('el índice combina valoración 50 %, entregas 35 % y reseñas 15 %', () => {
  // Sin reseñas previas (prior 4.0 con C = 5). Único mensajero del ámbito: todos sus máximos valen 1.
  const solo = rankScope([c({ courierId: 'x', deliveries: 20, reviewCount: 10, ratingSum: 50 })], 4);
  assert.equal(solo.length, 1);
  // ratingSum 50 / 10 reseñas = 5 → bayes = (50 + 5*4)/(10+5) = 70/15 = 4.6667
  assert.equal(solo[0].bayesRating, 4.67);
  // índice = 0.5*(4.6667/5) + 0.35*1 + 0.15*1 = 0.46667 + 0.5 = 0.9667
  assert.equal(solo[0].index, 0.9667);
  assert.equal(solo[0].ratingAvg, 5);
});

test('orden por índice y desempates: entregas, luego antigüedad, luego id', () => {
  const list = [
    c({ courierId: 'b', deliveries: 10, reviewCount: 5, ratingSum: 25, verifiedSince: 50 }),
    c({ courierId: 'a', deliveries: 10, reviewCount: 5, ratingSum: 25, verifiedSince: 40 }),
    c({ courierId: 'top', deliveries: 30, reviewCount: 5, ratingSum: 25, verifiedSince: 99 }),
  ];
  const ranked = rankScope(list, 5);
  assert.deepEqual(
    ranked.map((r) => [r.courierId, r.position]),
    [
      ['top', 1],
      ['a', 2],
      ['b', 3],
    ],
  );
});

test('buildRanking: nacional, provincial y municipal solo con elegibles; premios por posición', () => {
  const stats: CourierQuarterStat[] = [];
  // Provincia p1, municipio m1: cuatro elegibles y uno no elegible.
  for (let i = 1; i <= 4; i++) {
    stats.push(c({ courierId: `e${i}`, deliveries: 10 + i, reviewCount: 5, ratingSum: 25, provinceId: 'p1', municipalityId: 'm1' }));
  }
  stats.push(c({ courierId: 'no', deliveries: 3, reviewCount: 1, ratingSum: 5 }));
  const verified = new Map([['m1', 5]]);
  const r = buildRanking(stats, verified);

  assert.equal(r.eligibleCount, 4);
  assert.equal(r.national.some((x) => x.courierId === 'no'), false);
  assert.equal(r.national[0].prizePercent, 50);
  assert.equal(r.national[1].prizePercent, null);

  const prov = r.byProvince.get('p1') ?? [];
  assert.deepEqual(prov.slice(0, 3).map((x) => x.prizePercent), [35, 30, 25]);

  // El municipio tiene 5 verificados (< 10): el resultado conserva la lista, pero el endpoint no la publica.
  assert.equal(municipalityPublished(r.verifiedByMunicipality.get('m1') ?? 0), false);
});

test('municipio sin verificados no genera lista', () => {
  const r = buildRanking([], new Map());
  assert.equal(r.national.length, 0);
  assert.equal(r.byMunicipality.size, 0);
});
