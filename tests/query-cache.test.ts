// Caché persistente en el dispositivo: qué consultas se guardan (v2.3.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUERY_CACHE_MAX_AGE_MS, shouldPersistQuery } from '../web/src/lib/query-cache-policy';

test('el panel del mensajero y sus datos de cuenta se guardan para verse sin red', () => {
  assert.equal(shouldPersistQuery(['courier-dashboard']), true);
  assert.equal(shouldPersistQuery(['courier-wallet']), true);
  assert.equal(shouldPersistQuery(['conversations', 'user-1']), true);
  assert.equal(shouldPersistQuery(['territories']), true);
});

test('administración, mensajes y búsquedas nunca se guardan en el dispositivo', () => {
  assert.equal(shouldPersistQuery(['admin-overview']), false);
  assert.equal(shouldPersistQuery(['admin-accounts', 'x']), false);
  assert.equal(shouldPersistQuery(['messages', 'conv-1']), false);
  assert.equal(shouldPersistQuery(['search', 'top']), false);
  assert.equal(shouldPersistQuery([]), false);
});

test('la caché guardada caduca a las 24 h', () => {
  assert.equal(QUERY_CACHE_MAX_AGE_MS, 24 * 60 * 60 * 1000);
});
