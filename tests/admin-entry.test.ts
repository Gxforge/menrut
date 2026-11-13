// Entrada de staff: /admin, /app/admin o ?admin muestran el inicio de sesión de administración.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminEntry } from '../web/src/lib/admin-entry';

function at(pathname: string, search = '') {
  (globalThis as { window?: unknown }).window = { location: { pathname, search } };
}
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

test('/admin, /app/admin y ?admin son entrada de staff', () => {
  at('/admin');
  assert.equal(isAdminEntry(), true);
  at('/app/admin');
  assert.equal(isAdminEntry(), true);
  at('/app/admin/');
  assert.equal(isAdminEntry(), true);
  at('/app/', '?admin');
  assert.equal(isAdminEntry(), true);
});

test('la app normal no es entrada de staff', () => {
  at('/app/');
  assert.equal(isAdminEntry(), false);
  at('/app/mensajeros');
  assert.equal(isAdminEntry(), false);
  at('/');
  assert.equal(isAdminEntry(), false);
});
