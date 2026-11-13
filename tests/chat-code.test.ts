// Pruebas de la capa de eventos del chat (código de entrega y encargo, v2.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageRow } from '../src/v2/chat-code';

const base = {
  id: 'm1',
  conversation_id: 'c1',
  sender_id: 'client-1',
  body: 'Código de entrega',
  read_at: null,
  created_at: Math.floor(Date.now() / 1000),
};

test('mensaje de texto: kind text y sin carga útil', () => {
  const dto = messageRow({ ...base, kind: 'text', payload: null, ref_id: null }, 'client-1');
  assert.equal(dto.kind, 'text');
  assert.equal(dto.payload, null);
  assert.equal(dto.mine, true);
});

test('código pendiente vigente conserva su estado', () => {
  const payload = JSON.stringify({ deliveryId: 'd1', code: '123456', expiresAt: Date.now() + 60_000, status: 'pending' });
  const dto = messageRow({ ...base, kind: 'delivery_code', payload, ref_id: 'd1' }, 'courier-1');
  assert.equal(dto.kind, 'delivery_code');
  assert.equal((dto.payload as { status: string }).status, 'pending');
  assert.equal(dto.refId, 'd1');
});

test('código vencido se marca como expirado al leerlo', () => {
  const payload = JSON.stringify({ deliveryId: 'd1', code: '123456', expiresAt: Date.now() - 1000, status: 'pending' });
  const dto = messageRow({ ...base, kind: 'delivery_code', payload, ref_id: 'd1' }, 'client-1');
  assert.equal((dto.payload as { status: string }).status, 'expired');
});

test('código ya confirmado por el cliente no pasa a expirado', () => {
  const payload = JSON.stringify({ deliveryId: 'd1', code: '123456', expiresAt: Date.now() - 1000, status: 'confirmed' });
  const dto = messageRow({ ...base, kind: 'delivery_code', payload, ref_id: 'd1' }, 'client-1');
  assert.equal((dto.payload as { status: string }).status, 'confirmed');
});

test('encargo: lleva la descripción en la carga útil', () => {
  const payload = JSON.stringify({ description: 'Caja de 2 kg' });
  const dto = messageRow({ ...base, kind: 'encargo', payload, body: 'Caja de 2 kg' }, 'courier-1');
  assert.equal(dto.kind, 'encargo');
  assert.deepEqual(dto.payload, { description: 'Caja de 2 kg' });
});

test('carga útil corrupta no rompe la lectura del chat', () => {
  const dto = messageRow({ ...base, kind: 'encargo', payload: '{no-json', body: 'x' }, 'courier-1');
  assert.equal(dto.payload, null);
});

test('mensajes antiguos sin columnas nuevas siguen siendo texto', () => {
  const dto = messageRow({ ...base }, 'client-1');
  assert.equal(dto.kind, 'text');
  assert.equal(dto.refId, null);
});

test('el código solo lo ve quien lo generó (el cliente); el mensajero no', () => {
  const row = {
    ...base,
    kind: 'delivery_code',
    ref_id: 'd1',
    payload: JSON.stringify({ deliveryId: 'd1', code: '484596', expiresAt: Date.now() + 3600_000, status: 'pending' }),
  };
  const asClient = messageRow(row, 'client-1').payload as Record<string, unknown>;
  assert.equal(asClient.code, '484596');
  const asCourier = messageRow(row, 'courier-9').payload as Record<string, unknown>;
  assert.equal(asCourier.code, undefined);
  assert.equal(asCourier.deliveryId, 'd1');
  assert.equal(asCourier.status, 'pending');
  // Sin mutar la fila original
  assert.match(row.payload, /484596/);
});
