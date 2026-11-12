// Pruebas de las cuentas propietarias protegidas: siempre propietarias y no eliminables.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ownerEmails } from '../src/v2/core';
import { staffRoleFor } from '../src/v2/identity';

const env = { OWNER_EMAILS: 'Nexolink.core1@gmail.com', ADMIN_EMAILS: 'admin@x.com' } as never;

test('la cuenta protegida es propietaria aunque OWNER_EMAILS no la liste', () => {
  assert.equal(staffRoleFor(env, 'studio.lexair@gmail.com'), 'owner');
  assert.equal(staffRoleFor(env, 'STUDIO.LEXAIR@gmail.com'), 'owner');
});

test('los propietarios del entorno siguen siendo propietarios', () => {
  assert.equal(staffRoleFor(env, 'nexolink.core1@gmail.com'), 'owner');
  assert.equal(staffRoleFor(env, 'admin@x.com'), 'admin');
});

test('la lista de propietarios no repite correos', () => {
  const list = ownerEmails({ OWNER_EMAILS: 'studio.lexair@gmail.com,a@b.com' } as never);
  assert.equal(list.filter((e) => e === 'studio.lexair@gmail.com').length, 1);
});
