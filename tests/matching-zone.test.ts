// Regresión: un mensajero de zona aparece en «De mi zona» y en cercanos cuando su
// municipio base es el origen (o destino). Antes solo contaba la lista de cobertura,
// que un mensajero de zona nunca tiene, y quedaba fuera de la búsqueda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatch, type SearchProfile } from '../src/v2/matching';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const SANTA_CLARA = 'mun-santa-clara';
const GUANE = 'mun-guane';

function profile(over: Partial<SearchProfile>): SearchProfile {
  return {
    courierId: 'c1',
    userId: 'c1',
    fullName: 'Mensajero de prueba',
    avatarUrl: null,
    verificationStatus: 'unverified',
    ratingAvg: 0,
    ratingCount: 0,
    verifiedDeliveries: 0,
    baseFeeCup: null,
    availabilityNote: '',
    vehicleSummary: '',
    coverageType: 'zone',
    isDemo: 0,
    highlightedUntil: 0,
    services: [],
    coverage: [],
    routes: [],
    ...over,
  };
}

test('zona: su municipio base como origen lo hace aparecer con la razón de cobertura', () => {
  const m = computeMatch(
    profile({ municipalityId: SANTA_CLARA }),
    SANTA_CLARA, null, 'Santa Clara', null, 'prov-vc', null, NOW,
  );
  assert.equal(m.tier, 2);
  assert.ok(m.reasons.includes('Cobertura en tu municipio'));
});

test('zona: su municipio base como destino también cuenta', () => {
  const m = computeMatch(
    profile({ municipalityId: GUANE }),
    SANTA_CLARA, GUANE, 'Santa Clara', 'Guane', 'prov-vc', 'prov-pr', NOW,
  );
  assert.notEqual(m.tier, 3);
});

test('zona: fuera de su municipio base no aparece', () => {
  const m = computeMatch(
    profile({ municipalityId: GUANE }),
    SANTA_CLARA, null, 'Santa Clara', null, 'prov-vc', null, NOW,
  );
  assert.equal(m.tier, 3);
});

test('zona sin municipio base declarado no aparece por ubicación', () => {
  const m = computeMatch(
    profile({ municipalityId: null }),
    SANTA_CLARA, null, 'Santa Clara', null, 'prov-vc', null, NOW,
  );
  assert.equal(m.tier, 3);
});

test('municipal: el municipio base no basta; sigue contando solo la lista de cobertura', () => {
  const m = computeMatch(
    profile({ coverageType: 'municipal', municipalityId: SANTA_CLARA }),
    SANTA_CLARA, null, 'Santa Clara', null, 'prov-vc', null, NOW,
  );
  assert.equal(m.tier, 3);
});
