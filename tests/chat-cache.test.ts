// Caché del chat en el dispositivo: retención de 3 días y borrado al cerrar sesión.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_RETENTION_MS,
  clearChatCache,
  mergeById,
  purgeChatCache,
  readChatCache,
  writeChatCache,
} from '../web/src/lib/chat-cache';
import type { MessageDto } from '../web/src/lib/types';

// localStorage en memoria (sin DOM): el módulo solo usa window.localStorage.
const mem = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
};

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
const msg = (id: string, ageMs: number, conv = 'c1'): MessageDto => ({
  id,
  conversationId: conv,
  senderId: 'u1',
  mine: false,
  body: id,
  readAt: null,
  createdAt: new Date(NOW - ageMs).toISOString(),
});
const H = 3600_000;

beforeEach(() => mem.clear());

test('retención: 3 días en total; más viejo se borra', () => {
  writeChatCache('c1', [msg('nuevo', H), msg('dos-dias', 2 * 24 * H), msg('viejo', DEVICE_RETENTION_MS + H)], NOW);
  const ids = readChatCache('c1', NOW).map((m) => m.id);
  assert.deepEqual(ids, ['dos-dias', 'nuevo']);
});

test('orden cronológico ascendente', () => {
  writeChatCache('c1', [msg('b', H), msg('a', 5 * H)], NOW);
  assert.deepEqual(readChatCache('c1', NOW).map((m) => m.id), ['a', 'b']);
});

test('sin duplicados: el último escrito gana (el servidor)', () => {
  writeChatCache('c1', [{ ...msg('x', H), body: 'viejo' }], NOW);
  writeChatCache('c1', [{ ...msg('x', H), body: 'nuevo' }], NOW);
  const list = readChatCache('c1', NOW);
  assert.equal(list.length, 1);
  assert.equal(list[0].body, 'nuevo');
});

test('purga global elimina conversaciones vacías', () => {
  writeChatCache('c1', [msg('a', 4 * 24 * H, 'c1')], NOW - 4 * 24 * H);
  writeChatCache('c2', [msg('b', H, 'c2')], NOW);
  purgeChatCache(NOW);
  const stored = JSON.parse(mem.get('menrut-chat-cache-v1') as string) as Record<string, unknown>;
  assert.deepEqual(Object.keys(stored), ['c2']);
});

test('cerrar sesión borra todo', () => {
  writeChatCache('c1', [msg('a', H)], NOW);
  clearChatCache();
  assert.equal(mem.has('menrut-chat-cache-v1'), false);
  assert.deepEqual(readChatCache('c1', NOW), []);
});

test('mergeById ordena y une sin duplicar', () => {
  const out = mergeById([msg('a', 2 * H)], [msg('b', H), msg('a', 2 * H)]);
  assert.deepEqual(out.map((m) => m.id), ['a', 'b']);
});
