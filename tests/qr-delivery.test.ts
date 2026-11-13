// Validación de entrega por QR: formato, aceptación local y cola sin conexión.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQrPayload,
  flushQueue,
  localDecision,
  parseQrPayload,
  pruneQueue,
  readQueue,
  writeQueue,
  QUEUE_KEY,
  type QrQueueItem,
} from '../web/src/lib/qr-delivery';

const ID = 'c0mwf9wlja3bm9d1kn';
const NOW = Date.UTC(2026, 10, 13, 18, 0, 0);
const card = (status: 'pending' | 'client_confirmed' | 'confirmed' | 'cancelled' | 'expired', expiresAt = NOW + 3600_000) => ({
  deliveryId: ID,
  status,
  expiresAt,
});
const item = (over: Partial<QrQueueItem> = {}): QrQueueItem => ({
  id: 'q1',
  conversationId: 'conv1',
  deliveryId: ID,
  code: '484596',
  action: 'verify',
  createdAt: NOW,
  state: 'queued',
  ...over,
});

test('el QR ida y vuelta conserva entrega y código', () => {
  const text = buildQrPayload(ID, '484596');
  assert.deepEqual(parseQrPayload(text), { deliveryId: ID, code: '484596' });
});

test('parseQrPayload rechaza textos que no son de MENRUT', () => {
  for (const bad of [
    '',
    'hola',
    'MENRUT-ENTREGA|1|' + ID + '|12345',
    'MENRUT-ENTREGA|2|' + ID + '|123456',
    'MENRUT-ENTREGA|1|ab|123456',
    'MENRUT-ENTREGA|1|' + ID + '|12a456',
    'MENRUT-ENTREGA|1|' + ID + '|123456|extra',
    'https://example.com/?x=1',
  ]) {
    assert.equal(parseQrPayload(bad), null, bad);
  }
});

test('el mensajero solo acepta el QR cuando el cliente ya confirmó', () => {
  const scan = { deliveryId: ID, code: '484596' };
  assert.deepEqual(localDecision(card('client_confirmed'), scan, true, NOW), { ok: true, action: 'verify' });
  const pending = localDecision(card('pending'), scan, true, NOW);
  assert.equal(pending.ok, false);
  assert.match(pending.ok ? '' : pending.reason, /cliente aún no/);
});

test('el cliente confirma la recepción al escanear mientras está pendiente', () => {
  const scan = { deliveryId: ID, code: '484596' };
  assert.deepEqual(localDecision(card('pending'), scan, false, NOW), { ok: true, action: 'client-confirm' });
  const after = localDecision(card('client_confirmed'), scan, false, NOW);
  assert.equal(after.ok, false);
});

test('un QR de otra entrega o de una entrega ya cerrada se rechaza al instante', () => {
  const other = { deliveryId: 'otra-entrega-99', code: '484596' };
  assert.equal(localDecision(card('client_confirmed'), other, true, NOW).ok, false);
  assert.equal(localDecision(card('confirmed'), { deliveryId: ID, code: '484596' }, true, NOW).ok, false);
  assert.equal(localDecision(card('cancelled'), { deliveryId: ID, code: '484596' }, false, NOW).ok, false);
  assert.equal(localDecision(card('client_confirmed', NOW - 1), { deliveryId: ID, code: '484596' }, true, NOW).ok, false);
});

test('flushQueue quita los confirmados y anula los rechazados por el servidor', async () => {
  const items = [item({ id: 'ok' }), item({ id: 'no', code: '000001' }), item({ id: 'red' })];
  const out = await flushQueue(items, async (it) => {
    if (it.id === 'ok') return { kind: 'ok' };
    if (it.id === 'no') return { kind: 'rejected', reason: 'El código no coincide.' };
    return { kind: 'retry' };
  });
  assert.deepEqual(out.map((i) => i.id), ['no', 'red']);
  assert.equal(out[0].state, 'void');
  assert.equal(out[0].reason, 'El código no coincide.');
  assert.equal(out[1].state, 'queued');
});

test('flushQueue no reenvía elementos ya anulados', async () => {
  let calls = 0;
  const out = await flushQueue([item({ state: 'void', reason: 'x' })], async () => {
    calls++;
    return { kind: 'ok' };
  });
  assert.equal(calls, 0);
  assert.equal(out.length, 1);
});

test('los anulados caducan a las 24 h y los pendientes se conservan', () => {
  const old = NOW - 25 * 3600_000;
  const kept = pruneQueue([item({ id: 'a', state: 'void', createdAt: old }), item({ id: 'b', createdAt: old })], NOW);
  assert.deepEqual(kept.map((i) => i.id), ['b']);
});

test('la cola persiste en almacenamiento y se lee tras recargar', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  writeQueue([item({ id: 'p1' })], storage);
  assert.ok(data.has(QUEUE_KEY));
  assert.deepEqual(readQueue(storage).map((i) => i.id), ['p1']);
  data.set(QUEUE_KEY, '{no-es-json');
  assert.deepEqual(readQueue(storage), []);
});
